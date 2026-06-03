import ipaddress

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from django.apps import apps
from rest_framework.response import Response
from ipware import get_client_ip
from geopy.distance import geodesic

from accounts.permissions import IsAdminOrHR
from employees.models import Employee, EmployeeStatus
from .models import AttendanceRecord, AttendanceStatus, LeaveRequest, LeaveStatus
from .permissions import IsAdminOrReadOnly
from .serializers import AttendanceRecordSerializer, TodayAttendanceSerializer, LeaveRequestSerializer
from .services import auto_mark_calendar_days, sync_leave_request_attendance


def get_ip_address(request):
    """Get the real client IP address, respecting proxies and load balancers."""
    ip, _ = get_client_ip(request)
    return ip or "0.0.0.0"


def ip_is_allowed(client_ip: str, allowed_ranges: str) -> bool:
    """
    Check whether client_ip is permitted by the configured allowed_ip_ranges.
    Supports both exact IPs (e.g. 203.0.113.5) and CIDR notation (e.g. 192.168.1.0/24).
    Returns True if any range matches.
    """
    try:
        client = ipaddress.ip_address(client_ip)
    except ValueError:
        return False

    for raw in allowed_ranges.split(","):
        raw = raw.strip()
        if not raw:
            continue
        try:
            # Handles both single IPs and CIDR ranges uniformly
            network = ipaddress.ip_network(raw, strict=False)
            if client in network:
                return True
        except ValueError:
            # Invalid entry in the allow-list — skip it safely
            continue
    return False


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 31
    page_size_query_param = 'page_size'
    max_page_size = 100


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAdminOrReadOnly]
    queryset = AttendanceRecord.objects.select_related("employee").all()
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ["check_in", "check_out"]:
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        params = self.request.query_params

        date_from = params.get("date_from")
        date_to = params.get("date_to")
        year = params.get("year")
        month = params.get("month")
        day = params.get("day")
        status_filter = params.get("status")
        search = params.get("search")

        # By default, only return today's records unless specific filters are provided
        if self.action == "list" and not any([date_from, date_to, year, month, day, search]):
            queryset = queryset.filter(date=timezone.now().date())

        # Enforce data isolation: Employees can only view their own records
        if user.is_authenticated and user.role == "EMPLOYEE":
            queryset = queryset.filter(employee__email__iexact=user.email)

        queryset = queryset.filter(date__lte=timezone.now().date())

        # if year and month:
        #     try:
        #         auto_mark_calendar_days(int(month), int(year))
        #     except (TypeError, ValueError):
        #         pass

        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if year:
            queryset = queryset.filter(date__year=year)
        if month:
            queryset = queryset.filter(date__month=month)
        if day:
            queryset = queryset.filter(date__day=day)
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        if search:
            queryset = queryset.filter(
                Q(employee__full_name__icontains=search)
                | Q(employee__employee_id__icontains=search)
                | Q(employee__email__icontains=search)
            )

        return queryset

    def paginate_queryset(self, queryset):
        # If filtering by month, return all results for that month without pagination.
        if 'month' in self.request.query_params:
            return None
        return super().paginate_queryset(queryset)

    def _current_employee(self):
        employee = Employee.objects.filter(email__iexact=self.request.user.email).first()
        if employee is None and self.request.user.employee_id:
            employee = Employee.objects.filter(employee_id=self.request.user.employee_id).first()
        if employee is None:
            raise NotFound("No employee profile is linked to this login account.")
        if employee.status != EmployeeStatus.ACTIVE:
            raise ValidationError({"detail": "Only active employees can mark attendance."})
        return employee

    def _today_record(self, employee):
        today = timezone.localdate()
        return AttendanceRecord.objects.filter(employee=employee, date=today).first()

    def _avatar_url(self, employee):
        if not employee.profile_photo:
            return None
        return self.request.build_absolute_uri(employee.profile_photo.url)

    def _today_payload(self, employee, record=None):
        today = timezone.localdate()
        return {
            "employee_uuid": employee.id,
            "employee_id": employee.employee_id,
            "employee_name": employee.full_name,
            "employee_email": employee.email,
            "employee_department": employee.department,
            "employee_designation": employee.designation,
            "employee_avatar_url": self._avatar_url(employee),
            "record_id": record.id if record else None,
            "date": record.date if record else today,
            "check_in": record.check_in if record else None,
            "check_out": record.check_out if record else None,
            "total_hours": record.total_hours if record else None,
            "status": record.status if record else AttendanceStatus.ABSENT,
            "status_label": record.get_status_display() if record else "Absent",
            "live_status": record.live_status if record else "Absent",
        }

    @action(detail=False, methods=["get"], url_path="today")
    def today(self, request):
        today = timezone.localdate()
        auto_mark_calendar_days(today.month, today.year)
        records = {
            record.employee.id: record
            for record in AttendanceRecord.objects.select_related("employee").filter(date=today)
        }
        employees = Employee.objects.filter(status=EmployeeStatus.ACTIVE).order_by("full_name")
        payload = [self._today_payload(employee, records.get(employee.id)) for employee in employees]
        serializer = TodayAttendanceSerializer(payload, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        employee = self._current_employee()
        queryset = self.get_queryset().filter(employee=employee)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="me/today")
    def me_today(self, request):
        employee = self._current_employee()
        today = timezone.localdate()
        auto_mark_calendar_days(today.month, today.year)
        record = self._today_record(employee)
        serializer = TodayAttendanceSerializer(self._today_payload(employee, record))
        return Response(serializer.data)

    def _validate_location_and_ip(self, request, action_label: str = "attendance"):
        """
        Shared validator for both check-in and check-out.
        Enforces IP restriction (with full CIDR support) and geofencing.
        Returns a dict of location data captured (may be empty if restrictions are off).
        Raises ValidationError with a clear, user-friendly message on any violation.
        """
        SystemSettings = apps.get_model('settings', 'SystemSettings')
        settings = SystemSettings.get_settings()
        location_data = {}

        # ―――――――――― IP Restriction ――――――――――
        if settings.ip_restriction_enabled:
            allowed_ranges = settings.allowed_ip_ranges or ""
            if not allowed_ranges.strip():
                raise ValidationError({
                    "detail": (
                        f"IP restriction is enabled but no allowed IPs are configured. "
                        f"Please contact your administrator."
                    )
                })

            client_ip = get_ip_address(request)
            if not ip_is_allowed(client_ip, allowed_ranges):
                raise ValidationError({
                    "detail": (
                        f"Access denied: Your current IP address ({client_ip}) is not authorised "
                        f"to mark {action_label}. Please connect to the office network and try again."
                    ),
                    "code": "IP_RESTRICTED",
                    "client_ip": client_ip,
                })
            location_data["ip"] = client_ip
        else:
            location_data["ip"] = get_ip_address(request)

        # ―――――――――― Geofencing ――――――――――
        if settings.geofencing_enabled:
            if not settings.office_latitude or not settings.office_longitude:
                raise ValidationError({
                    "detail": (
                        "Geofencing is enabled but office coordinates are not set. "
                        "Please contact your administrator."
                    )
                })

            raw_lat = request.data.get("latitude")
            raw_lon = request.data.get("longitude")
            # Optional: client-provided accuracy in meters (from Geolocation API)
            raw_acc = request.data.get("accuracy")

            if raw_lat is None or raw_lon is None:
                raise ValidationError({
                    "detail": (
                        f"Your GPS location is required to mark {action_label}. "
                        f"Please allow location access in your browser and try again."
                    ),
                    "code": "LOCATION_REQUIRED",
                })

            try:
                user_lat = float(raw_lat)
                user_lon = float(raw_lon)
                accuracy_m = float(raw_acc) if raw_acc is not None else None
            except (ValueError, TypeError):
                raise ValidationError({
                    "detail": "Invalid location coordinates received. Please try again."
                })

            office_lat = float(settings.office_latitude)
            office_lon = float(settings.office_longitude)
            if not (-90.0 <= office_lat <= 90.0) or not (-180.0 <= office_lon <= 180.0):
                raise ValidationError({
                    "detail": (
                        "Configured office coordinates are invalid. Please contact your administrator."
                    )
                })

            if not (-90.0 <= user_lat <= 90.0) or not (-180.0 <= user_lon <= 180.0):
                raise ValidationError({
                    "detail": "Invalid GPS coordinates received. Please try again."
                })

            office_location = (office_lat, office_lon)
            user_location = (user_lat, user_lon)
            distance_m = int(geodesic(user_location, office_location).meters)
            # Also compute distance if user coordinates were accidentally swapped (lat<->lon)
            try:
                swapped_distance_m = int(geodesic((user_lon, user_lat), office_location).meters)
            except Exception:
                swapped_distance_m = distance_m

            # Use the smallest plausible distance (handles accidental swap)
            effective_distance_m = min(distance_m, swapped_distance_m)

            allowed_radius = getattr(settings, "geofence_radius", None) or 100

            # If the device reports poor accuracy that exceeds reasonable bounds, ask user to improve
            if accuracy_m is not None and accuracy_m > 5000:
                raise ValidationError({
                    "detail": (
                        "Location accuracy is too low for a reliable geofence check. "
                        "Ensure device location mode is set to high accuracy (GPS) and try again."
                    ),
                    "code": "LOW_ACCURACY",
                    "reported_accuracy_meters": int(accuracy_m),
                })

            # Accept if within allowed radius OR if reported accuracy covers the distance
            within_radius = effective_distance_m <= allowed_radius
            covered_by_accuracy = (accuracy_m is not None) and (effective_distance_m <= (allowed_radius + accuracy_m))

            if not (within_radius or covered_by_accuracy):
                raise ValidationError({
                    "detail": (
                        f"Location check failed: You are {effective_distance_m}m away from the office. "
                        f"{action_label.capitalize()} is only allowed within {allowed_radius}m of the office. "
                        f"Please move closer and try again."
                    ),
                    "code": "OUTSIDE_GEOFENCE",
                    "distance_meters": effective_distance_m,
                    "allowed_radius_meters": allowed_radius,
                    "office_location": {
                        "latitude": office_lat,
                        "longitude": office_lon,
                    },
                    "user_location": {
                        "latitude": user_lat,
                        "longitude": user_lon,
                        "accuracy_meters": int(accuracy_m) if accuracy_m is not None else None,
                        "swapped_distance_meters": swapped_distance_m if swapped_distance_m != distance_m else None,
                    },
                })

            location_data["latitude"] = user_lat
            location_data["longitude"] = user_lon

        return location_data

    # Keep backward-compatible alias
    def _validate_check_in(self, request):
        return self._validate_location_and_ip(request, action_label="check-in")

    @action(detail=False, methods=["post"], url_path="check-in")
    def check_in(self, request):
        # 1. Validate location & IP restrictions
        location_data = self._validate_location_and_ip(request, action_label="check-in")

        # 2. Get or create today's record
        employee = self._current_employee()
        today = timezone.localdate()
        record, created = AttendanceRecord.objects.get_or_create(employee=employee, date=today)

        if record.check_in:
            raise ValidationError({"detail": "You have already checked in today."})

        # 3. Save the check-in with audit trail
        record.check_in = timezone.now()
        record.check_in_ip = location_data.get("ip")
        record.check_in_latitude = location_data.get("latitude")
        record.check_in_longitude = location_data.get("longitude")
        record.refresh_status()
        record.save(auto_refresh_status=False)

        serializer = self.get_serializer(record)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="check-out")
    def check_out(self, request):
        # 1. Validate location & IP restrictions (same rules as check-in)
        location_data = self._validate_location_and_ip(request, action_label="check-out")

        # 2. Verify the employee has an open check-in
        employee = self._current_employee()
        record = self._today_record(employee)

        if record is None or not record.check_in:
            raise ValidationError({"detail": "Please check in before checking out."})
        if record.check_out:
            raise ValidationError({"detail": "You have already checked out today."})

        # 3. Save the check-out with audit trail
        record.check_out = timezone.now()
        record.check_out_ip = location_data.get("ip")
        record.check_out_latitude = location_data.get("latitude")
        record.check_out_longitude = location_data.get("longitude")
        record.refresh_status()
        record.save(auto_refresh_status=False)

        serializer = self.get_serializer(record)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="auto-mark")
    def auto_mark(self, request):
        """Create missing Sunday and holiday records without overriding edits."""

        month = request.data.get("month")
        year = request.data.get("year")

        if not month or not year:
            return Response(
                {"detail": "Both month and year are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            month = int(month)
            year = int(year)
        except ValueError:
            return Response(
                {"detail": "Month and year must be valid integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        today = timezone.now().date()
        if year > today.year or (year == today.year and month > today.month):
            return Response(
                {"detail": "Cannot auto-mark attendance for future months."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = auto_mark_calendar_days(month, year)

        return Response(
            {
                "detail": "Auto-marking completed successfully.",
                "created": result["created"],
                "updated": result.get("updated", 0),
                "skipped": result["skipped"],
            },
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = self.request.user

        if user.role not in ["SUPER_ADMIN", "HR"] and instance.employee.email != user.email:
            return Response(
                {"detail": "You do not have permission to delete this record."},
                status=status.HTTP_403_FORBIDDEN,
            )

        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], url_path="my-ip", permission_classes=[IsAuthenticated])
    def my_ip(self, request):
        """
        Returns the detected IP address of the requesting client.
        Used by the admin settings page to easily find the correct IP to whitelist.
        """
        SystemSettings = apps.get_model('settings', 'SystemSettings')
        settings = SystemSettings.get_settings()
        client_ip = get_ip_address(request)

        # Check if this IP is already in the allow-list
        allowed_ranges = settings.allowed_ip_ranges or ""
        is_allowed = ip_is_allowed(client_ip, allowed_ranges) if settings.ip_restriction_enabled else None

        return Response({
            "client_ip": client_ip,
            "ip_restriction_enabled": settings.ip_restriction_enabled,
            "is_currently_allowed": is_allowed,
            "allowed_ranges": allowed_ranges,
        })


class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.select_related("employee").all()
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Isolation: Employees only see their own leave requests
        if user.is_authenticated and user.role not in ["SUPER_ADMIN", "HR"] and not user.is_staff:
            try:
                employee = Employee.objects.get(email=user.email)
                queryset = queryset.filter(employee=employee)
            except Employee.DoesNotExist:
                queryset = queryset.none()
        return queryset

    def _raise_if_leave_overlaps(self, employee, start_date, end_date, instance=None):
        overlapping_requests = LeaveRequest.objects.filter(
            employee=employee,
            start_date__lte=end_date,
            end_date__gte=start_date,
        ).exclude(status=LeaveStatus.REJECTED)
        if instance:
            overlapping_requests = overlapping_requests.exclude(pk=instance.pk)
        if overlapping_requests.exists():
            raise ValidationError(
                {"detail": "A pending or approved leave request already exists for this date range."}
            )

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in ["SUPER_ADMIN", "HR"] and not user.is_staff:
            try:
                employee = Employee.objects.get(email=user.email)
                self._raise_if_leave_overlaps(
                    employee,
                    serializer.validated_data["start_date"],
                    serializer.validated_data["end_date"],
                )
                leave_request = serializer.save(employee=employee, status=LeaveStatus.PENDING)
            except Employee.DoesNotExist:
                raise ValidationError({"detail": "No employee profile is linked to this user account."})
        else:
            leave_request = serializer.save()

        sync_leave_request_attendance(leave_request)

    def perform_update(self, serializer):
        user = self.request.user
        
        # If user is Employee, they cannot update status or admin_notes
        if user.role not in ["SUPER_ADMIN", "HR"] and not user.is_staff:
            if "status" in self.request.data or "admin_notes" in self.request.data:
                raise ValidationError({"detail": "Employees are not authorized to approve/reject leave requests or edit admin notes."})
            if serializer.instance.status != LeaveStatus.PENDING:
                raise ValidationError({"detail": "Only pending leave requests can be edited by employees."})
            leave_request = serializer.save()
        else:
            leave_request = serializer.save()

        sync_leave_request_attendance(leave_request)

    def perform_destroy(self, instance):
        with transaction.atomic():
            instance.status = LeaveStatus.REJECTED
            sync_leave_request_attendance(instance)
            instance.delete()