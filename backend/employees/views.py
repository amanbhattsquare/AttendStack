from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound

from accounts.permissions import IsAdminOrHR
from django.contrib.auth import get_user_model
from django.db.models import Exists, OuterRef

from organizations.models import Organization
from .models import Employee
from .serializers import EmployeeSerializer, EmployeeProfileSerializer, EmployeeListSerializer
from .services import create_employee_user, reset_employee_user_password

User = get_user_model()


class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAdminOrHR]
    queryset = Employee.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["full_name", "email", "employee_id", "department", "designation"]
    ordering_fields = ["full_name", "joining_date", "department", "created_at"]
    ordering = ["full_name"]

    def get_permissions(self):
        if self.action == "me":
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if not user.is_superuser:
            try:
                employee = Employee.objects.get(email=user.email)
                queryset = queryset.filter(organization=employee.organization)
            except Employee.DoesNotExist:
                return queryset.none()

        queryset = queryset.annotate(
            account_exists_annotation=Exists(
                User.objects.filter(email__iexact=OuterRef("email"))
            )
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
                # This case should ideally not happen for non-superusers
                pass
        
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

    @action(detail=False, methods=["get", "put", "patch"], url_path="me")
    def me(self, request):
        employee = (
            self.get_queryset()
            .filter(email__iexact=request.user.email)
            .first()
        )

        if employee is None and request.user.employee_id:
            employee = (
                self.get_queryset()
                .filter(employee_id=request.user.employee_id)
                .first()
            )

        if employee is None:
            raise NotFound("No employee profile is linked to this login account.")

        if request.method in ["PUT", "PATCH"]:
            serializer = self.get_serializer(employee, data=request.data, partial=request.method == "PATCH")
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = EmployeeSerializer(employee, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="create-password")
    def create_password(self, request, pk=None):
        employee = self.get_object()
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