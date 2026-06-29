from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from attendance.permissions import IsAdminOrReadOnly
from employees.models import Employee
from .models import Payroll, PayrollStatus
from .serializers import PayrollSerializer
from .services import build_employee_payroll_summary, calculate_attendance_payroll, payroll_period_end

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

        active_employees = Employee.objects.attendance_eligible_on(
            payroll_period_end(month, year)
        ).filter(
            joining_date__lte=payroll_period_end(month, year),
        )
        generated_count = 0
        updated_count = 0
        skipped_count = 0

        for emp in active_employees:
            existing = Payroll.objects.filter(employee=emp, month=month, year=year).first()

            # Recalculate all stored amounts from the single attendance payroll service.
            # Existing PAID rows keep their status/paid_on, but stale buggy amounts are repaired.
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

    @action(detail=False, methods=["get"], url_path="summary")
    def monthly_summary(self, request):
        month = request.query_params.get("month")
        year = request.query_params.get("year")
        search = request.query_params.get("search")

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

        employees = Employee.objects.attendance_eligible_on(
            payroll_period_end(month, year)
        ).filter(
            joining_date__lte=payroll_period_end(month, year),
        ).order_by("full_name")
        if search:
            employees = employees.filter(
                Q(full_name__icontains=search)
                | Q(employee_id__icontains=search)
                | Q(email__icontains=search)
            )

        user = request.user
        if user.is_authenticated and user.role not in ["SUPER_ADMIN", "HR"] and not user.is_staff:
            employees = employees.filter(email__iexact=user.email)

        return Response([build_employee_payroll_summary(employee, month, year, request) for employee in employees])
