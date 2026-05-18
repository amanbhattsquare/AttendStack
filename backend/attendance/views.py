from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdminOrHR
from employees.models import Employee, EmployeeStatus
from .models import AttendanceRecord, AttendanceStatus
from .permissions import IsAdminOrReadOnly
from .serializers import AttendanceRecordSerializer, TodayAttendanceSerializer


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAdminOrReadOnly]
    queryset = AttendanceRecord.objects.select_related("employee").all()



    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Enforce data isolation: Employees can only view their own records
        if user.is_authenticated and user.role == "EMPLOYEE":
            queryset = queryset.filter(employee__email__iexact=user.email)
            
        params = self.request.query_params

        date_from = params.get("date_from")
        date_to = params.get("date_to")
        year = params.get("year")
        month = params.get("month")
        day = params.get("day")
        status_filter = params.get("status")
        search = params.get("search")

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
        records = {
            record.employee_id: record
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
        record = self._today_record(employee)
        serializer = TodayAttendanceSerializer(self._today_payload(employee, record))
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="check-in")
    def check_in(self, request):
        employee = self._current_employee()
        today = timezone.localdate()
        record, created = AttendanceRecord.objects.get_or_create(employee=employee, date=today)

        if record.check_in:
            raise ValidationError({"detail": "You have already checked in today."})

        record.check_in = timezone.now()
        record.refresh_status()
        record.save()
        serializer = self.get_serializer(record)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="check-out")
    def check_out(self, request):
        employee = self._current_employee()
        record = self._today_record(employee)

        if record is None or not record.check_in:
            raise ValidationError({"detail": "Please check in before checking out."})
        if record.check_out:
            raise ValidationError({"detail": "You have already checked out today."})

        record.check_out = timezone.now()
        record.refresh_status()
        record.save()
        serializer = self.get_serializer(record)
        return Response(serializer.data)