from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from attendance.permissions import IsAdminOrReadOnly
from employees.models import Employee
from .models import Payroll, PayrollStatus
from .serializers import PayrollSerializer
from .services import build_employee_payroll_summary, calculate_attendance_payroll, payable_employment_dates, payroll_period_end

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

        employees = Employee.objects.filter(
            joining_date__lte=payroll_period_end(month, year),
        )
        generated_count = 0
        updated_count = 0
        skipped_count = 0

        for emp in employees:
            if not payable_employment_dates(emp, month, year):
                skipped_count += 1
                continue
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

        employees = Employee.objects.filter(
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

        return Response([
            build_employee_payroll_summary(employee, month, year, request)
            for employee in employees
            if payable_employment_dates(employee, month, year)
        ])


from .models import EmployeeIncrement, IncrementStatus
from .serializers import (
    EmployeeIncrementSerializer,
    RescheduleIncrementSerializer,
    ProcessIncrementActionSerializer,
)
from .increment_service import (
    sync_employee_increments,
    approve_increment,
    reject_increment,
    reschedule_increment,
    get_effective_increment_config,
)
from django.utils import timezone


class EmployeeIncrementViewSet(viewsets.ModelViewSet):
    queryset = EmployeeIncrement.objects.select_related("employee", "action_by").all()
    serializer_class = EmployeeIncrementSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        # Trigger auto-sync for active employees on listing
        try:
            sync_employee_increments()
        except Exception:
            pass

        queryset = super().get_queryset()
        user = self.request.user

        # Employee role restriction
        if user.is_authenticated and user.role not in ["SUPER_ADMIN", "HR"] and not user.is_staff:
            try:
                emp = Employee.objects.get(email=user.email)
                queryset = queryset.filter(employee=emp)
            except Employee.DoesNotExist:
                return queryset.none()

        status_param = self.request.query_params.get("status")
        search_param = self.request.query_params.get("search")
        employee_id_param = self.request.query_params.get("employee_id")

        if status_param:
            queryset = queryset.filter(status=status_param.upper())
        if employee_id_param:
            queryset = queryset.filter(employee__id=employee_id_param)
        if search_param:
            queryset = queryset.filter(
                Q(employee__full_name__icontains=search_param) |
                Q(employee__employee_id__icontains=search_param) |
                Q(employee__department__icontains=search_param)
            )

        return queryset

    @action(detail=False, methods=["get"], url_path="summary")
    def increment_summary(self, request):
        """Returns high-level summary metrics for increments."""
        try:
            sync_employee_increments()
        except Exception:
            pass

        today = timezone.localdate()
        this_month_start = today.replace(day=1)
        
        pending_count = EmployeeIncrement.objects.filter(status=IncrementStatus.PENDING).count()
        due_this_month = EmployeeIncrement.objects.filter(
            status=IncrementStatus.PENDING,
            due_date__gte=this_month_start,
            due_date__lte=today.replace(day=28) + timezone.timedelta(days=4)
        ).count()
        approved_this_year = EmployeeIncrement.objects.filter(
            status=IncrementStatus.APPROVED,
            action_date__year=today.year
        ).count()

        return Response({
            "pending_count": pending_count,
            "due_this_month": due_this_month,
            "approved_this_year": approved_this_year,
        })

    @action(detail=False, methods=["get"], url_path="my-increment")
    def my_increment(self, request):
        """Employee endpoint to fetch their own current increment config & upcoming schedule."""
        user = request.user
        if not user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            emp = Employee.objects.get(email=user.email)
        except Employee.DoesNotExist:
            return Response({"detail": "Employee profile not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            sync_employee_increments(emp)
        except Exception:
            pass

        enabled, months, inc_type, inc_val = get_effective_increment_config(emp)

        pending_increment = EmployeeIncrement.objects.filter(
            employee=emp,
            status__in=[IncrementStatus.PENDING, IncrementStatus.RESCHEDULED]
        ).order_by("due_date").first()

        history = EmployeeIncrement.objects.filter(
            employee=emp
        ).order_by("-created_at")[:10]

        pending_data = EmployeeIncrementSerializer(pending_increment, context={"request": request}).data if pending_increment else None
        history_data = EmployeeIncrementSerializer(history, many=True, context={"request": request}).data

        return Response({
            "employee_id": str(emp.id),
            "full_name": emp.full_name,
            "joining_date": emp.joining_date,
            "annual_salary": emp.annual_salary,
            "last_increment_date": emp.last_increment_date,
            "next_increment_date": emp.next_increment_date,
            "increment_enabled": enabled,
            "increment_cycle_months": months,
            "increment_type": inc_type,
            "increment_value": inc_val,
            "pending_increment": pending_data,
            "history": history_data
        })

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        """Admin action to approve/accept an employee increment."""
        increment = self.get_object()
        serializer = ProcessIncrementActionSerializer(data=request.data)
        serializer.is_validate_or_raise = True
        serializer.is_valid(raise_exception=True)

        try:
            approved_item = approve_increment(
                increment=increment,
                user=request.user,
                notes=serializer.validated_data.get("notes", "")
            )
            return Response(
                EmployeeIncrementSerializer(approved_item, context={"request": request}).data,
                status=status.HTTP_200_OK
            )
        except ValueError as err:
            return Response({"detail": str(err)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        """Admin action to reject an employee increment."""
        increment = self.get_object()
        serializer = ProcessIncrementActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            rejected_item = reject_increment(
                increment=increment,
                user=request.user,
                notes=serializer.validated_data.get("notes", "")
            )
            return Response(
                EmployeeIncrementSerializer(rejected_item, context={"request": request}).data,
                status=status.HTTP_200_OK
            )
        except ValueError as err:
            return Response({"detail": str(err)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="reschedule")
    def reschedule(self, request, pk=None):
        """Admin action to reschedule/postpone an employee increment."""
        increment = self.get_object()
        serializer = RescheduleIncrementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            rescheduled_item = reschedule_increment(
                increment=increment,
                new_date=serializer.validated_data["rescheduled_date"],
                user=request.user,
                notes=serializer.validated_data.get("notes", "")
            )
            return Response(
                EmployeeIncrementSerializer(rescheduled_item, context={"request": request}).data,
                status=status.HTTP_200_OK
            )
        except ValueError as err:
            return Response({"detail": str(err)}, status=status.HTTP_400_BAD_REQUEST)

