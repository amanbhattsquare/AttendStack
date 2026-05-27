from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from attendance.permissions import IsAdminOrReadOnly
from employees.models import Employee, EmployeeStatus
from .models import Payroll, PayrollStatus
from .serializers import PayrollSerializer
from .services import calculate_attendance_payroll

class PayrollViewSet(viewsets.ModelViewSet):
    queryset = Payroll.objects.select_related("employee").all()
    serializer_class = PayrollSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        month = self.request.query_params.get("month")
        year = self.request.query_params.get("year")
        search = self.request.query_params.get("search")

        if month:
            queryset = queryset.filter(month=month)
        if year:
            queryset = queryset.filter(year=year)
        if search:
            queryset = queryset.filter(employee__full_name__icontains=search)

        # Enforce secure employee data isolation
        user = self.request.user
        if user.is_authenticated and user.role not in ["SUPER_ADMIN", "HR"] and not user.is_staff:
            try:
                employee = Employee.objects.get(email=user.email)
                queryset = queryset.filter(employee=employee)
            except Employee.DoesNotExist:
                queryset = queryset.none()

        return queryset

    @action(detail=False, methods=["post"], url_path="generate")
    def generate_payroll(self, request):
        month = request.data.get("month")
        year = request.data.get("year")

        if not month or not year:
            return Response(
                {"detail": "Both month and year are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            month = int(month)
            year = int(year)
        except ValueError:
            return Response(
                {"detail": "Month and year must be valid integers."},
                status=status.HTTP_400_BAD_REQUEST
            )

        active_employees = Employee.objects.filter(status=EmployeeStatus.ACTIVE)
        generated_count = 0
        updated_count = 0
        skipped_count = 0

        for emp in active_employees:
            existing = Payroll.objects.filter(employee=emp, month=month, year=year).first()
            if existing and existing.status == PayrollStatus.PAID:
                skipped_count += 1
                continue

            allowances = existing.allowances if existing else 0
            payroll_values = calculate_attendance_payroll(emp, month, year, allowances=allowances)

            if existing:
                existing.basic_salary = payroll_values["basic_salary"]
                existing.deductions = payroll_values["deductions"]
                existing.deduction_details = payroll_values["deduction_details"]
                existing.save()
                updated_count += 1
            else:
                Payroll.objects.create(
                    employee=emp,
                    month=month,
                    year=year,
                    basic_salary=payroll_values["basic_salary"],
                    allowances=payroll_values["allowances"],
                    deductions=payroll_values["deductions"],
                    deduction_details=payroll_values["deduction_details"],
                    status=PayrollStatus.PENDING
                )
                generated_count += 1

        return Response({
            "detail": "Payroll generation completed successfully.",
            "generated": generated_count,
            "updated": updated_count,
            "skipped": skipped_count
        }, status=status.HTTP_201_CREATED)