from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from accounts.models import UserRole
from accounts.permissions import IsAdminOrHR, IsSuperAdmin
from attendance.models import AttendanceRecord, LeaveRequest
from employees.models import Employee, EmployeeStatus
from .models import Organization
from .serializers import OrganizationSerializer, AdministratorSerializer

User = get_user_model()


class OrganizationVerifyCodeView(APIView):
    """
    Public endpoint to verify if an AttendStack Organization Code is valid and active.
    Used by SimplyJob to check status before sending invitations.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        code = str(request.query_params.get("code") or "").strip().upper()
        if not code:
            return Response({"valid": False, "error": "Code is required."}, status=status.HTTP_400_BAD_REQUEST)

        org = Organization.objects.filter(invite_code__iexact=code, is_active=True).first()
        if not org:
            return Response({
                "valid": False,
                "code": code,
                "error": "The organization code does not exist or has been expired/reset."
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "valid": True,
            "code": org.invite_code,
            "organization_id": org.id,
            "organization_name": org.name,
            "is_active": org.is_active,
        }, status=status.HTTP_200_OK)

    def post(self, request):
        code = str(request.data.get("code") or request.query_params.get("code") or "").strip().upper()
        if not code:
            return Response({"valid": False, "error": "Code is required."}, status=status.HTTP_400_BAD_REQUEST)

        org = Organization.objects.filter(invite_code__iexact=code, is_active=True).first()
        if not org:
            return Response({
                "valid": False,
                "code": code,
                "error": "The organization code does not exist or has been expired/reset."
            }, status=status.HTTP_404_NOT_FOUND)

class OrganizationVerifyApiKeyView(APIView):
    """
    Public endpoint to verify an AttendStack API Key.
    Used by SimplyJob to connect and auto-sync Organization details & Plan status.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return self._verify(request)

    def post(self, request):
        return self._verify(request)

    def _verify(self, request):
        raw_key = (
            request.query_params.get("api_key")
            or request.data.get("api_key")
            or request.headers.get("X-API-Key")
            or request.headers.get("Authorization", "").replace("Bearer ", "")
            or ""
        ).strip()

        if not raw_key:
            return Response(
                {"valid": False, "error": "API Key is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        org = Organization.objects.filter(api_key=raw_key, is_active=True).first()
        if not org:
            return Response(
                {
                    "valid": False,
                    "error": "Invalid or inactive AttendStack API Key. Please verify the key in AttendStack Settings > API & Integrations.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # If POST contains plan sync data, update the organization record
        if request.method == "POST" and request.data:
            from django.utils.dateparse import parse_datetime

            plan_name = request.data.get("plan_name")
            plan_expires_at = request.data.get("plan_expires_at")
            plan_source = request.data.get("plan_source")
            max_employees = request.data.get("max_employees")

            update_fields = ["plan_status"]
            if plan_name:
                org.plan_name = str(plan_name).strip()
                update_fields.append("plan_name")
            if plan_expires_at:
                if isinstance(plan_expires_at, str):
                    parsed_exp = parse_datetime(plan_expires_at)
                    org.plan_expires_at = parsed_exp or plan_expires_at
                else:
                    org.plan_expires_at = plan_expires_at
                update_fields.append("plan_expires_at")
            if plan_source:
                org.plan_source = str(plan_source).strip()
                update_fields.append("plan_source")
            if max_employees is not None:
                org.max_employees = int(max_employees)
                update_fields.append("max_employees")

            org.plan_status = org.computed_plan_status
            org.save(update_fields=update_fields)
        else:
            # Refresh plan status in DB
            org.plan_status = org.computed_plan_status
            org.save(update_fields=["plan_status"])

        return Response({
            "valid": True,
            "organization_id": org.id,
            "organization_name": org.name,
            "invite_code": org.invite_code,
            "external_company_id": org.external_company_id,
            "plan_name": org.plan_name or "Standard Plan",
            "plan_expires_at": org.plan_expires_at.isoformat() if org.plan_expires_at else None,
            "plan_status": org.computed_plan_status,
            "plan_source": org.plan_source,
            "days_until_plan_expiry": org.days_until_plan_expiry,
            "is_plan_expiring_soon": org.is_plan_expiring_soon,
            "is_plan_expired": org.is_plan_expired,
            "max_employees": org.max_employees,
            "employee_count": org.employees.count(),
            "active_employee_count": org.employees.filter(status=EmployeeStatus.ACTIVE).count(),
        }, status=status.HTTP_200_OK)



class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all().order_by("-created_at")
    serializer_class = OrganizationSerializer

    def get_permissions(self):
        if self.action == "verify_code":
            return [permissions.AllowAny()]
        if self.action in ["create", "update", "partial_update", "destroy", "toggle_status", "superadmin_overview", "stats"]:
            return [IsAdminOrHR()]
        return [permissions.IsAuthenticated()]

    def get_authenticators(self):
        if getattr(self, "action", None) == "verify_code":
            return []
        return super().get_authenticators()

    def _find_user_organization(self, user):
        if not user or not user.is_authenticated:
            return None
        # 1. Direct ownership
        org = Organization.objects.filter(owner=user).first()
        if org:
            return org
        # 2. Employee profile
        if hasattr(user, "employee_profile") and user.employee_profile and user.employee_profile.organization:
            return user.employee_profile.organization
        # 3. Employee email match
        org = Organization.objects.filter(employees__email__iexact=user.email).first()
        if org:
            return org
        # 4. Email keyword match (e.g. bhattsquare email -> Bhatt Square org)
        if "bhatt" in user.email.lower():
            org = Organization.objects.filter(name__icontains="Bhatt").first()
            if org:
                return org
        # 5. Super Admin / Admin default: primary founding organization (Bhatt Square or first created org)
        if user.is_superuser or user.role == UserRole.SUPER_ADMIN:
            return Organization.objects.filter(name__icontains="Bhatt").first() or Organization.objects.order_by("created_at").first()
        return None

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Organization.objects.none()

        scope = self.request.query_params.get("scope")
        if scope == "me":
            org = self._find_user_organization(user)
            if org:
                return Organization.objects.filter(id=org.id)
            return Organization.objects.none()

        from django.db.models import Case, When, Value, IntegerField

        user_org = self._find_user_organization(user)
        user_org_id = user_org.id if user_org else None

        if user.is_superuser or user.role == UserRole.SUPER_ADMIN:
            return Organization.objects.all().annotate(
                user_priority=Case(
                    When(id=user_org_id, then=Value(0)),
                    When(owner=user, then=Value(1)),
                    When(employees__email__iexact=user.email, then=Value(2)),
                    When(name__icontains="Bhatt", then=Value(3)),
                    default=Value(4),
                    output_field=IntegerField(),
                )
            ).distinct().order_by("user_priority", "id")

        if user.role == UserRole.HR:
            return (
                Organization.objects.filter(owner=user) | Organization.objects.filter(
                    employees__email__iexact=user.email
                )
            ).distinct().annotate(
                user_priority=Case(
                    When(id=user_org_id, then=Value(0)),
                    When(owner=user, then=Value(1)),
                    default=Value(2),
                    output_field=IntegerField(),
                )
            ).order_by("user_priority", "-created_at")

        return Organization.objects.none()

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        user = request.user
        org = self._find_user_organization(user)
        if not org:
            return Response({"detail": "No organization found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrganizationSerializer(org, context={"request": request}).data)



    def perform_create(self, serializer):
        owner = self.request.user
        owner_email = self.request.data.get("owner_email")
        if owner_email and (self.request.user.is_superuser or self.request.user.role == UserRole.SUPER_ADMIN):
            target_user = User.objects.filter(email__iexact=owner_email.strip()).first()
            if target_user:
                owner = target_user
            else:
                owner = User.objects.create_hr(
                    email=owner_email.strip(),
                    password="OrgOwner@123",
                    first_name=self.request.data.get("owner_first_name", "HR"),
                    last_name=self.request.data.get("owner_last_name", "Manager"),
                )
        serializer.save(owner=owner)

    def perform_update(self, serializer):
        organization = self.get_object()
        user = self.request.user
        if not (user.is_superuser or user.role == UserRole.SUPER_ADMIN or organization.owner_id == user.id):
            raise PermissionDenied("Only the organization owner or Super Admin can edit organization details.")
        
        owner_id = self.request.data.get("owner_id")
        if owner_id and (user.is_superuser or user.role == UserRole.SUPER_ADMIN):
            new_owner = User.objects.filter(id=owner_id).first()
            if new_owner:
                serializer.save(owner=new_owner)
                return

        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if not (user.is_superuser or user.role == UserRole.SUPER_ADMIN):
            raise PermissionDenied("Only Super Admins can delete an organization.")
        instance.delete()

    @action(detail=True, methods=["post"], url_path="toggle-status")
    def toggle_status(self, request, pk=None):
        organization = self.get_object()
        if not (request.user.is_superuser or request.user.role == UserRole.SUPER_ADMIN):
            raise PermissionDenied("Only Super Admins can toggle organization status.")
        organization.is_active = not organization.is_active
        organization.save(update_fields=["is_active"])
        return Response(OrganizationSerializer(organization, context={"request": request}).data)

    @action(detail=False, methods=["get", "post"], url_path="verify-code", permission_classes=[permissions.AllowAny], authentication_classes=[])
    def verify_code(self, request):
        """Public verification endpoint used by SimplyJob to check if an Org Code is valid and active."""
        code = str(request.query_params.get("code") or request.data.get("code") or "").strip().upper()
        if not code:
            return Response({"valid": False, "error": "Code is required."}, status=status.HTTP_400_BAD_REQUEST)

        org = Organization.objects.filter(invite_code__iexact=code, is_active=True).first()
        if not org:
            return Response({
                "valid": False,
                "code": code,
                "error": "The organization code does not exist or has been expired/reset."
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "valid": True,
            "code": org.invite_code,
            "organization_id": org.id,
            "organization_name": org.name,
            "is_active": org.is_active,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="regenerate-invite-code")
    def regenerate_invite_code(self, request, pk=None):
        organization = self.get_object()
        if not (request.user.is_superuser or request.user.role == UserRole.SUPER_ADMIN or organization.owner_id == request.user.id):
            raise PermissionDenied("Only the organization owner or Super Admin can regenerate its invite code.")

        from .models import generate_invite_code

        while True:
            invite_code = generate_invite_code()
            if not Organization.objects.filter(invite_code=invite_code).exists():
                organization.invite_code = invite_code
                organization.save(update_fields=["invite_code"])
                break

        data = OrganizationSerializer(organization, context={"request": request}).data
        data["message"] = f"New organization code generated: {organization.invite_code}. Please update this code in SimplyJob."
        return Response(data)

    @action(detail=True, methods=["post"], url_path="regenerate-api-key")
    def regenerate_api_key(self, request, pk=None):
        organization = self.get_object()
        if not (request.user.is_superuser or request.user.role == UserRole.SUPER_ADMIN or organization.owner_id == request.user.id):
            raise PermissionDenied("Only the organization owner or Super Admin can regenerate the API key.")

        from .models import generate_api_key

        while True:
            new_key = generate_api_key()
            if not Organization.objects.filter(api_key=new_key).exists():
                organization.api_key = new_key
                organization.save(update_fields=["api_key"])
                break

        data = OrganizationSerializer(organization, context={"request": request}).data
        data["message"] = "New API Key generated successfully. Please copy and paste it into SimplyJob."
        return Response(data)

    @action(detail=True, methods=["post"], url_path="sync-plan")
    def sync_plan(self, request, pk=None):
        organization = self.get_object()
        user = request.user
        api_key = request.headers.get("X-API-Key") or request.data.get("api_key")
        is_key_valid = bool(api_key and organization.api_key == api_key)

        if not (is_key_valid or (user.is_authenticated and (user.is_superuser or user.role == UserRole.SUPER_ADMIN or organization.owner_id == user.id))):
            raise PermissionDenied("Invalid credentials to sync organization plan.")

        plan_name = request.data.get("plan_name")
        plan_expires_at = request.data.get("plan_expires_at")
        plan_source = request.data.get("plan_source", "SIMPLYJOB")
        max_employees = request.data.get("max_employees")

        if plan_name:
            organization.plan_name = str(plan_name).strip()
        if plan_expires_at:
            organization.plan_expires_at = plan_expires_at
        if plan_source:
            organization.plan_source = str(plan_source).strip()
        if max_employees is not None:
            organization.max_employees = int(max_employees)

        organization.plan_status = organization.computed_plan_status
        organization.save()

        return Response(OrganizationSerializer(organization, context={"request": request}).data)

    def _process_plan_renewal(self, organization, user, request):
        allowed_roles = [UserRole.SUPER_ADMIN, UserRole.HR, getattr(UserRole, "ADMIN", "ADMIN")]
        is_authorized = (
            user.is_superuser
            or getattr(user, "role", "") in allowed_roles
            or organization.owner_id == user.id
            or organization.owner_id is None
        )
        if not is_authorized:
            raise PermissionDenied("Only organization administrators or owners can renew subscriptions.")

        if organization.owner_id is None and user.is_authenticated:
            organization.owner = user

        from datetime import timedelta
        from django.utils import timezone

        plan_name = str(request.data.get("plan_name", "Starter Plan")).strip()
        duration_days = int(request.data.get("duration_days", 30))
        max_employees = int(request.data.get("max_employees", 50))
        plan_source = str(request.data.get("plan_source", "ATTENDSTACK_DIRECT")).strip()

        base_date = organization.plan_expires_at if (organization.plan_expires_at and organization.plan_expires_at > timezone.now()) else timezone.now()
        organization.plan_name = plan_name
        organization.plan_expires_at = base_date + timedelta(days=duration_days)
        organization.plan_source = plan_source
        organization.max_employees = max_employees
        organization.plan_status = Organization.PlanStatus.ACTIVE
        organization.save(update_fields=["owner", "plan_name", "plan_expires_at", "plan_source", "max_employees", "plan_status"])

        data = OrganizationSerializer(organization, context={"request": request}).data
        data["message"] = f"Plan '{plan_name}' successfully renewed for {duration_days} days."
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="renew-plan")
    def renew_plan(self, request, pk=None):
        """Allows purchasing or renewing an AttendStack standalone plan by ID."""
        organization = self.get_object()
        return self._process_plan_renewal(organization, request.user, request)

    @action(detail=False, methods=["post"], url_path="renew-plan")
    def renew_plan_current(self, request):
        """Allows purchasing or renewing an AttendStack plan for the current user's workspace."""
        user = request.user
        org_id = request.data.get("organization_id")
        organization = Organization.objects.filter(id=org_id).first() if org_id else self._find_user_organization(user)
        if not organization:
            organization = Organization.objects.first()
        if not organization:
            return Response({"detail": "No organization found to activate plan."}, status=status.HTTP_404_NOT_FOUND)
        return self._process_plan_renewal(organization, user, request)

    @action(detail=True, methods=["post"], url_path="link-simplyjob")
    def link_simplyjob(self, request, pk=None):
        organization = self.get_object()
        user = request.user
        if not (user.is_superuser or user.role == UserRole.SUPER_ADMIN or organization.owner_id == user.id):
            raise PermissionDenied("Only organization owners or Super Admins can configure SimplyJob integration.")

        from .services import sync_invite_code_to_simplyjob

        simplyjob_org_id = request.data.get("simplyjob_org_id", "").strip()
        if not simplyjob_org_id:
            return Response({"detail": "SimplyJob Organization ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        organization.external_company_id = simplyjob_org_id
        organization.external_source = "SIMPLYJOB"
        organization.save(update_fields=["external_company_id", "external_source"])

        # Instant real-time webhook sync to SimplyJob
        sync_result = sync_invite_code_to_simplyjob(organization)

        data = OrganizationSerializer(organization, context={"request": request}).data
        data["simplyjob_sync"] = sync_result
        return Response(data)

    @action(detail=True, methods=["get", "post"], url_path="generate-invite-link")
    def generate_invite_link(self, request, pk=None):
        organization = self.get_object()
        user = request.user
        if not (user.is_superuser or user.role == UserRole.SUPER_ADMIN or organization.owner_id == user.id):
            raise PermissionDenied("Only organization owners or Super Admins can generate invitation links.")

        # ENFORCE RULE: If company has not set their SimplyJob org_id / external_company_id, block invitation!
        if not (organization.external_company_id or organization.external_source == "SIMPLYJOB"):
            return Response(
                {
                    "error": "SIMPLYJOB_NOT_LINKED",
                    "detail": "SimplyJob Organization ID is not configured. Please paste and save your SimplyJob Org ID before sending employee invitations.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.conf import settings
        base_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        invite_url = f"{base_url}/register?org_id={organization.invite_code}&source=simplyjob"
        return Response({
            "organization_id": organization.id,
            "organization_name": organization.name,
            "invite_code": organization.invite_code,
            "simplyjob_org_id": organization.external_company_id,
            "invite_url": invite_url,
            "is_simplyjob_linked": True,
        })

    @action(detail=True, methods=["get"], url_path="stats")
    def stats(self, request, pk=None):
        organization = self.get_object()
        user = request.user
        if not (user.is_superuser or user.role == UserRole.SUPER_ADMIN or organization.owner_id == user.id):
            raise PermissionDenied("Access restricted to Super Admins and Organization owner.")

        today = timezone.localdate()
        employees = organization.employees.all()
        employee_count = employees.count()
        active_employees = employees.filter(status=EmployeeStatus.ACTIVE).count()
        
        today_records = AttendanceRecord.objects.filter(employee__organization=organization, date=today)
        present_count = today_records.filter(status__in=["PRESENT", "HALF_DAY"]).count()
        late_count = today_records.filter(status="LATE").count()
        absent_count = today_records.filter(status="ABSENT").count()
        on_leave_count = today_records.filter(status__in=["LEAVE", "PAID_LEAVE"]).count()

        pending_leaves = LeaveRequest.objects.filter(employee__organization=organization, status="PENDING").count()

        employees_list = [
            {
                "id": str(emp.id),
                "employee_id": emp.employee_id,
                "full_name": emp.full_name,
                "email": emp.email,
                "department": emp.department,
                "designation": emp.designation,
                "status": emp.status,
                "joining_date": emp.joining_date,
            }
            for emp in employees[:50]
        ]

        return Response({
            "id": organization.id,
            "name": organization.name,
            "invite_code": organization.invite_code,
            "is_active": organization.is_active,
            "created_at": organization.created_at,
            "owner_name": organization.owner.get_full_name() if organization.owner else None,
            "owner_email": organization.owner.email if organization.owner else None,
            "employee_count": employee_count,
            "active_employees": active_employees,
            "today_attendance": {
                "present": present_count,
                "late": late_count,
                "absent": absent_count,
                "on_leave": on_leave_count,
            },
            "pending_leaves": pending_leaves,
            "employees": employees_list,
        })

    @action(detail=False, methods=["get"], url_path="superadmin-overview")
    def superadmin_overview(self, request):
        user = request.user
        if not (user.is_superuser or user.role == UserRole.SUPER_ADMIN):
            raise PermissionDenied("Only Super Admins can access platform overview.")

        today = timezone.localdate()
        orgs = Organization.objects.all().order_by("-created_at")
        total_companies = orgs.count()
        active_companies = orgs.filter(is_active=True).count()
        inactive_companies = orgs.filter(is_active=False).count()

        total_users = User.objects.count()
        total_hrs = User.objects.filter(role=UserRole.HR).count()
        total_employees = Employee.objects.count()

        today_attendance = AttendanceRecord.objects.filter(date=today, status__in=["PRESENT", "LATE", "HALF_DAY"]).count()
        total_pending_leaves = LeaveRequest.objects.filter(status="PENDING").count()

        orgs_serialized = OrganizationSerializer(orgs, many=True, context={"request": request}).data

        return Response({
            "summary": {
                "total_companies": total_companies,
                "active_companies": active_companies,
                "inactive_companies": inactive_companies,
                "total_users": total_users,
                "total_hrs": total_hrs,
                "total_employees": total_employees,
                "today_attendance": today_attendance,
                "pending_leaves": total_pending_leaves,
            },
            "organizations": orgs_serialized,
        })


class AdministratorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Employee.objects.filter(designation="Administrator")
    serializer_class = AdministratorSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        user = self.request.user
        queryset = Employee.objects.filter(designation="Administrator")
        if user.is_superuser or user.role == UserRole.SUPER_ADMIN:
            return queryset
        return queryset.filter(organization__owner=user)


from .models import Plan
from .serializers import PlanSerializer

class PlanViewSet(viewsets.ModelViewSet):
    queryset = Plan.objects.all().order_by("sort_order", "monthly_price")
    serializer_class = PlanSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAdminUser()]

    def get_queryset(self):
        user = self.request.user
        if user and user.is_authenticated and (user.is_superuser or getattr(user, "role", "") == UserRole.SUPER_ADMIN):
            return Plan.objects.all().order_by("sort_order", "monthly_price")
        return Plan.objects.filter(is_active=True).order_by("sort_order", "monthly_price")

    @action(detail=False, methods=["post"], url_path="seed-defaults")
    def seed_defaults(self, request):
        if not (request.user.is_superuser or getattr(request.user, "role", "") == UserRole.SUPER_ADMIN):
            raise PermissionDenied("Only Super Admins can seed default plans.")

        defaults = [
            {
                "name": "Starter Plan",
                "slug": "starter",
                "description": "Essential attendance tracking for startups & small teams.",
                "monthly_price": 499.00,
                "yearly_price": 4990.00,
                "max_employees": 15,
                "badge_text": "STARTER",
                "is_popular": False,
                "is_active": True,
                "sort_order": 1,
                "allows_employees": True,
                "allows_attendance": True,
                "allows_holidays": True,
                "allows_leaves": True,
                "allows_geofencing": False,
                "allows_payroll_reports": False,
                "allows_projects_tasks": False,
                "allows_chat": False,
                "allows_custom_shifts": False,
                "allows_auto_checkout": False,
                "allows_dedicated_api": False,
                "allows_simplyjob_sync": True,
                "features_list": [
                    "Up to 15 Active Employees",
                    "Real-Time Clock In / Out & Live Feed",
                    "SimplyJob 1-Click Candidate Onboarding",
                    "Standard Leave Management",
                    "Holidays Calendar Management",
                    "Monthly Attendance PDF Export",
                    "Standard Email Support",
                ],
            },
            {
                "name": "Growth Pro Plan",
                "slug": "growth-pro",
                "description": "Advanced automation, geofencing, payroll, tasks and team chat for scaling companies.",
                "monthly_price": 999.00,
                "yearly_price": 9990.00,
                "max_employees": 50,
                "badge_text": "MOST POPULAR",
                "is_popular": True,
                "is_active": True,
                "sort_order": 2,
                "allows_employees": True,
                "allows_attendance": True,
                "allows_holidays": True,
                "allows_leaves": True,
                "allows_geofencing": True,
                "allows_payroll_reports": True,
                "allows_projects_tasks": True,
                "allows_chat": True,
                "allows_custom_shifts": True,
                "allows_auto_checkout": True,
                "allows_dedicated_api": False,
                "allows_simplyjob_sync": True,
                "features_list": [
                    "Up to 50 Active Employees",
                    "Office IP Shield & GPS Geofencing",
                    "Salary & Payroll Processing (Payslips/Reports)",
                    "Projects & Tasks Workspace",
                    "Internal Team Chat & Direct Messaging",
                    "Automated Auto-Checkout & Overtime Rules",
                    "Multi-Shift & Late Rulebooks",
                    "Real-Time Two-Way SimplyJob Sync Engine",
                    "Priority WhatsApp & Ticket Support",
                ],
            },
            {
                "name": "Enterprise Sovereign Plan",
                "slug": "enterprise",
                "description": "Complete workforce sovereignty, custom shift logic, and dedicated API infrastructure.",
                "monthly_price": 1999.00,
                "yearly_price": 19990.00,
                "max_employees": -1,
                "badge_text": "UNLIMITED CAPACITY",
                "is_popular": False,
                "is_active": True,
                "sort_order": 3,
                "allows_employees": True,
                "allows_attendance": True,
                "allows_holidays": True,
                "allows_leaves": True,
                "allows_geofencing": True,
                "allows_payroll_reports": True,
                "allows_projects_tasks": True,
                "allows_chat": True,
                "allows_custom_shifts": True,
                "allows_auto_checkout": True,
                "allows_dedicated_api": True,
                "allows_simplyjob_sync": True,
                "features_list": [
                    "Unlimited Employees (500+ Active)",
                    "All HR, Attendance, Payroll & Leave Modules",
                    "Projects, Tasks & Team Chat Modules",
                    "Dedicated API Keys & Real-Time Webhooks",
                    "Multi-Branch & Location Hierarchy",
                    "Custom Overtime & Shift Rules Engine",
                    "Custom ERP & Payroll Export Pipelines",
                    "Single Sign-On (SSO) & Audit Logs",
                    "99.9% Uptime Guarantee & 24/7 SLA Support",
                ],
            },
        ]
        results = []
        for d in defaults:
            p, _ = Plan.objects.update_or_create(slug=d["slug"], defaults=d)
            results.append(PlanSerializer(p).data)
        return Response({"message": "Default plans seeded successfully.", "plans": results})