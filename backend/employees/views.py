from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsAdminOrHR
from django.contrib.auth import get_user_model
from django.db.models import Exists, OuterRef
from .models import Employee
from .serializers import EmployeeSerializer
from .services import create_employee_user, reset_employee_user_password

User = get_user_model()


class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    permission_classes = [IsAdminOrHR]
    queryset = Employee.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["full_name", "email", "employee_id", "department", "designation"]
    ordering_fields = ["full_name", "joining_date", "department", "created_at"]
    ordering = ["full_name"]

    def get_queryset(self):
        queryset = super().get_queryset().annotate(
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

    @action(detail=True, methods=["post"], url_path="create-password")
    def create_password(self, request, pk=None):
        employee = self.get_object()
        user, temporary_password = create_employee_user(employee)
        return Response(
            {
                "detail": "Login account created successfully.",
                "employee_id": employee.employee_id,
                "user_id": str(user.id),
                "email": user.email,
                "temporary_password": temporary_password,
            }
        )

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        employee = self.get_object()
        user, temporary_password = reset_employee_user_password(employee)
        return Response(
            {
                "detail": "Password reset successfully.",
                "employee_id": employee.employee_id,
                "user_id": str(user.id),
                "email": user.email,
                "temporary_password": temporary_password,
            }
        )
