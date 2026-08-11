from datetime import date, timedelta
from decimal import Decimal
from django.utils import timezone
from django.db import transaction

from settings.models import SystemSettings
from employees.models import Employee, EmployeeStatus
from .models import EmployeeIncrement, IncrementStatus, IncrementType


def add_months_to_date(source_date: date, months: int) -> date:
    """Helper to add months to a given date cleanly."""
    month = source_date.month - 1 + months
    year = source_date.year + month // 12
    month = month % 12 + 1
    day = min(source_date.day, [31, 29 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return date(year, month, day)


def get_effective_increment_config(employee: Employee, settings: SystemSettings = None):
    """
    Returns effective increment settings for an employee:
    (enabled: bool, months: int, type: str, value: Decimal)
    """
    if settings is None:
        settings = SystemSettings.get_settings()

    if not settings.increment_enabled:
        return False, settings.default_increment_months, settings.default_increment_type, Decimal(str(settings.default_increment_value))

    if employee.override_increment_policy:
        enabled = (employee.increment_status == "ENABLED")
        months = employee.custom_increment_months or settings.default_increment_months or 12
        inc_type = employee.custom_increment_type or settings.default_increment_type or "PERCENTAGE"
        inc_val = Decimal(str(employee.custom_increment_value if employee.custom_increment_value is not None else settings.default_increment_value))
        return enabled, months, inc_type, inc_val
    else:
        enabled = (employee.increment_status == "ENABLED")
        months = settings.default_increment_months or 12
        inc_type = settings.default_increment_type or "PERCENTAGE"
        inc_val = Decimal(str(settings.default_increment_value or 10.00))
        return enabled, months, inc_type, inc_val


def calculate_increment_amounts(current_salary: Decimal, inc_type: str, inc_val: Decimal):
    """Calculates increment rupee amount and new annual salary."""
    current_salary = Decimal(str(current_salary or 0))
    inc_val = Decimal(str(inc_val or 0))

    if inc_type == IncrementType.PERCENTAGE or inc_type == "PERCENTAGE":
        calc_amount = current_salary * (inc_val / Decimal("100"))
    else:
        calc_amount = inc_val

    calc_amount = calc_amount.quantize(Decimal("0.01"))
    new_salary = (current_salary + calc_amount).quantize(Decimal("0.01"))
    return calc_amount, new_salary


def sync_employee_increments(employee: Employee = None):
    """
    Ensures active employees have next_increment_date set and
    a PENDING EmployeeIncrement record created for upcoming cycle.
    """
    settings = SystemSettings.get_settings()
    if not settings.increment_enabled:
        return

    today = timezone.localdate()

    if employee:
        employees = [employee]
    else:
        employees = Employee.objects.filter(status=EmployeeStatus.ACTIVE)

    for emp in employees:
        enabled, months, inc_type, inc_val = get_effective_increment_config(emp, settings)
        if not enabled:
            continue

        ref_date = emp.last_increment_date or emp.joining_date or today
        due_date = add_months_to_date(ref_date, months)

        if emp.next_increment_date != due_date:
            emp.next_increment_date = due_date
            emp.save(update_fields=["next_increment_date"])

        current_salary = Decimal(str(emp.annual_salary or 0))
        calc_amount, new_salary = calculate_increment_amounts(current_salary, inc_type, inc_val)

        existing_pending = EmployeeIncrement.objects.filter(
            employee=emp,
            status__in=[IncrementStatus.PENDING, IncrementStatus.RESCHEDULED]
        ).first()

        if existing_pending:
            if existing_pending.status == IncrementStatus.PENDING:
                existing_pending.current_salary = current_salary
                existing_pending.increment_type = inc_type
                existing_pending.increment_value = inc_val
                existing_pending.calculated_increment_amount = calc_amount
                existing_pending.new_salary = new_salary
                existing_pending.due_date = due_date
                existing_pending.save()
        else:
            EmployeeIncrement.objects.create(
                employee=emp,
                due_date=due_date,
                current_salary=current_salary,
                increment_type=inc_type,
                increment_value=inc_val,
                calculated_increment_amount=calc_amount,
                new_salary=new_salary,
                status=IncrementStatus.PENDING,
            )


@transaction.atomic
def approve_increment(increment: EmployeeIncrement, user=None, notes: str = ""):
    """
    Approves an increment, updates employee annual salary,
    sets last_increment_date, and schedules next cycle.
    """
    if increment.status in [IncrementStatus.APPROVED, IncrementStatus.REJECTED]:
        raise ValueError("Increment has already been processed.")

    today = timezone.localdate()
    increment.status = IncrementStatus.APPROVED
    increment.action_date = timezone.now()
    if user and getattr(user, "is_authenticated", False):
        increment.action_by = user
    if notes:
        increment.notes = notes
    increment.save()

    emp = increment.employee
    emp.annual_salary = increment.new_salary
    emp.last_increment_date = increment.due_date or today

    enabled, months, inc_type, inc_val = get_effective_increment_config(emp)
    emp.next_increment_date = add_months_to_date(emp.last_increment_date, months)
    emp.save(update_fields=["annual_salary", "last_increment_date", "next_increment_date"])

    if enabled:
        next_calc_amount, next_new_salary = calculate_increment_amounts(emp.annual_salary, inc_type, inc_val)
        EmployeeIncrement.objects.create(
            employee=emp,
            due_date=emp.next_increment_date,
            current_salary=emp.annual_salary,
            increment_type=inc_type,
            increment_value=inc_val,
            calculated_increment_amount=next_calc_amount,
            new_salary=next_new_salary,
            status=IncrementStatus.PENDING
        )

    return increment


@transaction.atomic
def reject_increment(increment: EmployeeIncrement, user=None, notes: str = ""):
    """Rejects an increment request."""
    if increment.status in [IncrementStatus.APPROVED, IncrementStatus.REJECTED]:
        raise ValueError("Increment has already been processed.")

    increment.status = IncrementStatus.REJECTED
    increment.action_date = timezone.now()
    if user and getattr(user, "is_authenticated", False):
        increment.action_by = user
    if notes:
        increment.notes = notes
    increment.save()
    return increment


@transaction.atomic
def reschedule_increment(increment: EmployeeIncrement, new_date: date, user=None, notes: str = ""):
    """Reschedules an increment due date."""
    if increment.status == IncrementStatus.APPROVED:
        raise ValueError("Cannot reschedule an already approved increment.")

    increment.due_date = new_date
    increment.rescheduled_date = new_date
    increment.status = IncrementStatus.RESCHEDULED
    increment.action_date = timezone.now()
    if user and getattr(user, "is_authenticated", False):
        increment.action_by = user
    if notes:
        increment.notes = notes
    increment.save()

    emp = increment.employee
    emp.next_increment_date = new_date
    emp.save(update_fields=["next_increment_date"])

    return increment
