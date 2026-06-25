from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound

from accounts.permissions import IsAdminOrHR
from accounts.models import UserRole
from django.contrib.auth import get_user_model
from django.db.models import Case, Exists, IntegerField, OuterRef, Value, When

from organizations.models import Organization
from .models import Employee, EmployeeStatus
from .serializers import (
    EmployeeListSerializer,
    EmployeeProfileSerializer,
    EmployeeSerializer,
    EmployeeStatusUpdateSerializer,
)
from .services import (
    create_employee_user,
    reset_employee_user_password,
    sync_employee_user_access,
)

User = get_user_model()


class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    permission_classes = [IsAdminOrHR]
    queryset = Employee.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["full_name", "email", "employee_id", "department", "designation"]
    ordering_fields = ["full_name", "joining_date", "department", "created_at", "status"]
    ordering = ["status_sort", "full_name"]

    def get_permissions(self):
        if self.action in ("list", "me"):
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if not user.is_superuser:
            try:
                employee = Employee.objects.get(email=user.email)
                organization = employee.organization
            except Employee.DoesNotExist:
                # A company owner can manage their workspace before they have
                # an Employee profile of their own.
                organization = Organization.objects.filter(owner=user).first()
            if organization is None:
                return queryset.none()
            queryset = queryset.filter(organization=organization)

        queryset = queryset.annotate(
            account_exists_annotation=Exists(User.objects.filter(email__iexact=OuterRef("email"), role=UserRole.EMPLOYEE)),
            status_sort=Case(
                When(status=EmployeeStatus.ACTIVE, then=Value(0)),
                When(status=EmployeeStatus.PROVISION, then=Value(1)),
                When(status=EmployeeStatus.ON_LEAVE, then=Value(2)),
                When(status=EmployeeStatus.INACTIVE, then=Value(3)),
                When(status=EmployeeStatus.TERMINATED, then=Value(4)),
                default=Value(5),
                output_field=IntegerField(),
            ),
        )
        department = self.request.query_params.get("department")
        status_filter = self.request.query_params.get("status")

        if department:
            queryset = queryset.filter(department__iexact=department)
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        organization = None

        if user.is_superuser:
            # For superusers, assign the first organization as a default
            organization = Organization.objects.first()
        else:
            # For other users, derive organization from their own employee record
            try:
                employee = Employee.objects.get(email=user.email)
                organization = employee.organization
            except Employee.DoesNotExist:
                organization = Organization.objects.filter(owner=user).first()
        
        # Ensure an organization is set before saving
        if organization is None:
            # Handle case where no organization is found, perhaps raise an error
            # For now, we'll let the serializer handle it, which might fail if org is required
            pass

        serializer.save(organization=organization)

    def get_serializer_class(self):
        if self.action == "list":
            return EmployeeListSerializer
        if self.action == "me":
            return EmployeeProfileSerializer
        return super().get_serializer_class()

    def get_current_employee(self):
        user = self.request.user
        employee = Employee.objects.filter(email__iexact=user.email).first()

        if employee is None and user.employee_id:
            employee = Employee.objects.filter(employee_id=user.employee_id).first()

        return employee

    @action(detail=False, methods=["get", "put", "patch"], url_path="me")
    def me(self, request):
        employee = self.get_current_employee()
        if employee is None:
            raise NotFound("No employee profile is linked to this login account.")

        if request.method in ["PUT", "PATCH"]:
            serializer = self.get_serializer(
                employee,
                data=request.data,
                partial=request.method == "PATCH",
                context={"request": request},
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = EmployeeSerializer(employee, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="create-password")
    def create_password(self, request, pk=None):
        employee = self.get_object()
        user_exists = User.objects.filter(email__iexact=employee.email).exists()

        if user_exists:
            user, employee_password = reset_employee_user_password(
                employee,
                password=request.data.get("password"),
            )
            return Response(
                {
                    "detail": "Login account password updated successfully.",
                    "employee_id": employee.employee_id,
                    "user_id": str(user.id),
                    "email": user.email,
                    "temporary_password": employee_password,
                }
            )

        user, employee_password = create_employee_user(
            employee,
            password=request.data.get("password"),
        )
        return Response(
            {
                "detail": "Login account created successfully.",
                "employee_id": employee.employee_id,
                "user_id": str(user.id),
                "email": user.email,
                "temporary_password": employee_password,
            }
        )

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        employee = self.get_object()
        user, employee_password = reset_employee_user_password(
            employee,
            password=request.data.get("password"),
        )
        return Response(
            {
                "detail": "Password reset successfully.",
                "employee_id": employee.employee_id,
                "user_id": str(user.id),
                "email": user.email,
                "temporary_password": employee_password,
            }
        )

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        employee = self.get_object()
        serializer = EmployeeStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee.status = serializer.validated_data["status"]
        employee.save(update_fields=["status", "updated_at"])
        sync_employee_user_access(employee)

        response_serializer = EmployeeListSerializer(employee, context={"request": request})
        return Response(response_serializer.data)
