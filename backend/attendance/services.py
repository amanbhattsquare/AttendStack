import calendar
from datetime import date, timedelta

from django.db import transaction

from employees.models import Employee, EmployeeStatus
from holidays.models import Holiday
from settings.models import SystemSettings

from .models import AttendanceRecord, AttendanceStatus, LeaveStatus, LeaveType


def iter_dates(start_date: date, end_date: date):
    current_date = start_date
    while current_date <= end_date:
        yield current_date
        current_date += timedelta(days=1)


def _month_key(value: date) -> tuple[int, int]:
    return value.year, value.month


def _paid_leave_records_for_month(employee: Employee, year: int, month: int):
    return (
        AttendanceRecord.objects.select_related("leave_request")
        .filter(
            employee=employee,
            date__year=year,
            date__month=month,
            leave_request__status=LeaveStatus.APPROVED,
        )
        .exclude(leave_request__leave_type=LeaveType.OTHER)
        .order_by("date", "leave_request_id", "id")
    )


def _rebalance_monthly_paid_leaves(
    employee: Employee,
    year: int,
    month: int,
    paid_quota: int | None = None,
) -> int:
    settings = SystemSettings.get_settings()
    paid_quota = max(settings.monthly_paid_leave_days or 0, 0) if paid_quota is None else max(paid_quota, 0)
    leave_records = list(_paid_leave_records_for_month(employee, year, month))

    for index, record in enumerate(leave_records):
        should_be_paid = index < paid_quota
        target_status = AttendanceStatus.PAID_LEAVE if should_be_paid else AttendanceStatus.LEAVE
        target_paid = should_be_paid
        if record.status == target_status and record.is_paid == target_paid:
            continue

        record.status = target_status
        record.is_paid = target_paid
        record.notes = (
            f"Auto-marked from approved leave request #{record.leave_request_id}: "
            f"{'Paid leave' if should_be_paid else 'Unpaid leave'}"
        )
        record.save(auto_refresh_status=False, update_fields=["status", "is_paid", "notes", "updated_at"])

    return min(len(leave_records), paid_quota)


def _rebalance_yearly_paid_leaves(employee: Employee, year: int) -> None:
    settings = SystemSettings.get_settings()
    monthly_quota = max(settings.monthly_paid_leave_days or 0, 0)
    carryover_enabled = bool(settings.leave_carryover_enabled)
    max_carryover = max(settings.max_carryover_days or 0, 0)
    carried_balance = 0

    for month in range(1, 13):
        paid_quota = monthly_quota + carried_balance
        paid_count = _rebalance_monthly_paid_leaves(employee, year, month, paid_quota)
        unused_balance = max(paid_quota - paid_count, 0)
        carried_balance = min(unused_balance, max_carryover) if carryover_enabled else 0


def rebalance_paid_leave_attendance() -> dict[str, int]:
    """Recalculate paid/unpaid leave records after paid leave policy changes."""
    employee_years = set()
    leave_records = (
        AttendanceRecord.objects.filter(leave_request__status=LeaveStatus.APPROVED)
        .exclude(leave_request__leave_type=LeaveType.OTHER)
        .values_list("employee_id", "date")
    )

    for employee_id, leave_date in leave_records:
        employee_years.add((employee_id, leave_date.year))

    employees = Employee.objects.in_bulk({employee_id for employee_id, _ in employee_years})
    rebalanced_count = 0

    for employee_id, year in sorted(employee_years, key=lambda item: (str(item[0]), item[1])):
        employee = employees.get(employee_id)
        if not employee:
            continue
        _rebalance_yearly_paid_leaves(employee, year)
        rebalanced_count += 1

    return {"employee_years_rebalanced": rebalanced_count}


@transaction.atomic
def sync_leave_request_attendance(leave_request) -> dict[str, int]:
    """Create or clear attendance records that are driven by a leave approval."""
    existing_records = AttendanceRecord.objects.filter(leave_request=leave_request)
    affected_months = {_month_key(record.date) for record in existing_records}
    # A leave request can never create attendance before employment begins.
    requested_dates = {
        leave_date
        for leave_date in iter_dates(leave_request.start_date, leave_request.end_date)
        if leave_date >= leave_request.employee.joining_date
    }
    affected_months.update(_month_key(day) for day in requested_dates)

    if leave_request.status != LeaveStatus.APPROVED:
        deleted_count, _ = existing_records.delete()
        for year in {year for year, _ in affected_months}:
            _rebalance_yearly_paid_leaves(leave_request.employee, year)
        return {"created": 0, "updated": 0, "deleted": deleted_count}

    stale_records = existing_records.exclude(date__in=requested_dates)
    deleted_count, _ = stale_records.delete()

    created_count = 0
    updated_count = 0
    for leave_date in sorted(requested_dates):
        defaults = {
            "leave_request": leave_request,
            "check_in": None,
            "check_out": None,
            "status": AttendanceStatus.LEAVE,
            "is_paid": False,
            "notes": f"Auto-marked from approved leave request #{leave_request.id}: Unpaid leave",
        }
        _, created = AttendanceRecord.objects.update_or_create(
            employee=leave_request.employee,
            date=leave_date,
            defaults=defaults,
        )
        created_count += int(created)
        updated_count += int(not created)

    for year in {year for year, _ in affected_months}:
        _rebalance_yearly_paid_leaves(leave_request.employee, year)

    return {"created": created_count, "updated": updated_count, "deleted": deleted_count}


def auto_mark_calendar_days(month: int, year: int) -> dict[str, int]:
    """Create missing holiday and Sunday attendance records for active employees."""
    days_in_month = calendar.monthrange(year, month)[1]
    all_dates = [date(year, month, day) for day in range(1, days_in_month + 1)]
    holiday_dates = set(
        Holiday.objects.filter(date__year=year, date__month=month).values_list("date", flat=True)
    )
    sunday_dates = {day for day in all_dates if day.weekday() == 6} - holiday_dates

    created_count = 0
    updated_count = 0
    skipped_count = 0
    active_employees = Employee.objects.filter(status=EmployeeStatus.ACTIVE)

    for employee in active_employees:
        employment_start = max(employee.joining_date, date(year, month, 1))
        for holiday_date in holiday_dates:
            if holiday_date < employment_start:
                continue
            _, created = AttendanceRecord.objects.get_or_create(
                employee=employee,
                date=holiday_date,
                defaults={
                    "status": AttendanceStatus.HOLIDAY,
                    "notes": "Auto-marked: Holiday",
                },
            )
            created_count += int(created)
            skipped_count += int(not created)

        for sunday_date in sunday_dates:
            if sunday_date < employment_start:
                continue
            record, created = AttendanceRecord.objects.get_or_create(
                employee=employee,
                date=sunday_date,
                defaults={
                    "status": AttendanceStatus.SUNDAY_PAID,
                    "notes": "Auto-marked: Sunday (Paid)",
                },
            )
            if (
                not created
                and record.status == AttendanceStatus.ABSENT
                and record.notes == "Auto-marked: Sunday (Paid)"
                and not record.check_in
                and not record.check_out
            ):
                record.status = AttendanceStatus.SUNDAY_PAID
                record.is_paid = True
                record.save(auto_refresh_status=False, update_fields=["status", "is_paid", "updated_at"])
                updated_count += 1
                continue
            created_count += int(created)
            skipped_count += int(not created)

    return {"created": created_count, "updated": updated_count, "skipped": skipped_count}


def auto_mark_absent_yesterday():
    """Marks active employees as 'Absent' if they have no attendance record for yesterday."""
    yesterday = date.today() - timedelta(days=1)
    
    # Skip execution on weekends and holidays
    if yesterday.weekday() >= 5: # Saturday or Sunday
        return {"status": "skipped", "reason": "Weekend"}
        
    if Holiday.objects.filter(date=yesterday).exists():
        return {"status": "skipped", "reason": "Holiday"}

    active_employees = Employee.objects.filter(
        status=EmployeeStatus.ACTIVE,
        joining_date__lte=yesterday,
    )
    marked_absent_count = 0
    
    for employee in active_employees:
        has_record = AttendanceRecord.objects.filter(employee=employee, date=yesterday).exists()
        if not has_record:
            AttendanceRecord.objects.create(
                employee=employee,
                date=yesterday,
                status=AttendanceStatus.ABSENT,
                notes="Auto-marked: Absent"
            )
            marked_absent_count += 1
            
    return {"status": "completed", "marked_absent": marked_absent_count}
