from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from accounts.models import UserRole
from accounts.permissions import IsAdminOrHR, IsSuperAdmin
from attendance.models import AttendanceRecord, LeaveRequest
from employees.models import Employee, EmployeeStatus
from .models import Organization
from .serializers import OrganizationSerializer, AdministratorSerializer

User = get_user_model()


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all().order_by("-created_at")
    serializer_class = OrganizationSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "toggle_status", "superadmin_overview", "stats"]:
            return [IsAdminOrHR()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Organization.objects.none()

        scope = self.request.query_params.get("scope")
        if scope == "me":
            org = Organization.objects.filter(owner=user).first()
            if not org:
                org = Organization.objects.filter(employees__email__iexact=user.email).first()
            if org:
                return Organization.objects.filter(id=org.id)
            if user.is_superuser or user.role == UserRole.SUPER_ADMIN:
                return Organization.objects.all().order_by("-created_at")[:1]
            return Organization.objects.none()

        from django.db.models import Case, When, Value, IntegerField

        if user.is_superuser or user.role == UserRole.SUPER_ADMIN:
            return Organization.objects.all().annotate(
                user_priority=Case(
                    When(owner=user, then=Value(0)),
                    When(employees__email__iexact=user.email, then=Value(1)),
                    default=Value(2),
                    output_field=IntegerField(),
                )
            ).distinct().order_by("user_priority", "-created_at")

        if user.role == UserRole.HR:
            return (
                Organization.objects.filter(owner=user) | Organization.objects.filter(
                    employees__email__iexact=user.email
                )
            ).distinct().annotate(
                user_priority=Case(
                    When(owner=user, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField(),
                )
            ).order_by("user_priority", "-created_at")

        return Organization.objects.none()

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        user = request.user
        org = Organization.objects.filter(owner=user).first()
        if not org:
            org = Organization.objects.filter(employees__email__iexact=user.email).first()
        if not org and (user.is_superuser or user.role == UserRole.SUPER_ADMIN):
            org = Organization.objects.order_by("-created_at").first()
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
        return Response(OrganizationSerializer(organization, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="link-simplyjob")
    def link_simplyjob(self, request, pk=None):
        organization = self.get_object()
        user = request.user
        if not (user.is_superuser or user.role == UserRole.SUPER_ADMIN or organization.owner_id == user.id):
            raise PermissionDenied("Only organization owners or Super Admins can configure SimplyJob integration.")

        simplyjob_org_id = request.data.get("simplyjob_org_id", "").strip()
        if not simplyjob_org_id:
            return Response({"detail": "SimplyJob Organization ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        organization.external_company_id = simplyjob_org_id
        organization.external_source = "SIMPLYJOB"
        organization.save(update_fields=["external_company_id", "external_source"])
        return Response(OrganizationSerializer(organization, context={"request": request}).data)

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

