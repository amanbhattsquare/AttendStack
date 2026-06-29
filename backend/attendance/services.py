import calendar
from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction

from employees.models import ATTENDANCE_WORKING_STATUSES, Employee
from holidays.models import Holiday
from settings.models import SystemSettings

from .models import AttendanceRecord, AttendanceStatus, LeaveStatus, LeaveType


def iter_dates(start_date: date, end_date: date):
    current_date = start_date
    while current_date <= end_date:
        yield current_date
        current_date += timedelta(days=1)


LEAVE_ALLOCATION_FIELDS = {
    LeaveType.CASUAL: "casual_leave_days",
    LeaveType.SICK: "sick_leave_days",
    LeaveType.MATERNITY: "maternity_leave_days",
    LeaveType.PATERNITY: "paternity_leave_days",
    LeaveType.BEREAVEMENT: "bereavement_leave_days",
    LeaveType.MARRIAGE: "marriage_leave_days",
}


def leave_allocation(settings: SystemSettings, leave_type: str) -> Decimal:
    """Return the configured annual allowance for one supported leave type."""
    field_name = LEAVE_ALLOCATION_FIELDS.get(leave_type)
    return Decimal(str(max(getattr(settings, field_name, 0), 0))) if field_name else Decimal("0")


def leave_units(leave_request) -> Decimal:
    return Decimal("0.5") if leave_request.is_half_day else Decimal("1")


def _rebalance_yearly_paid_leaves(employee: Employee, year: int) -> None:
    """Apply each annual leave allocation independently and chronologically."""
    settings = SystemSettings.get_settings()

    for leave_type in LEAVE_ALLOCATION_FIELDS:
        paid_allowance = leave_allocation(settings, leave_type)
        paid_used = Decimal("0")
        leave_records = AttendanceRecord.objects.select_related("leave_request").filter(
            employee=employee,
            date__year=year,
            leave_request__status=LeaveStatus.APPROVED,
            leave_request__leave_type=leave_type,
        ).order_by("date", "leave_request_id", "id")

        for record in leave_records:
            request = record.leave_request
            units = leave_units(request)
            should_be_paid = paid_used + units <= paid_allowance
            if should_be_paid:
                paid_used += units

            target_status = (
                AttendanceStatus.HALF_DAY
                if request.is_half_day
                else (AttendanceStatus.PAID_LEAVE if should_be_paid else AttendanceStatus.LEAVE)
            )
            target_note = (
                f"Auto-marked from approved leave request #{request.id}: "
                f"{'Paid' if should_be_paid else 'Unpaid'} "
                f"{'half-day ' if request.is_half_day else ''}leave"
            )
            if (
                record.status == target_status
                and record.is_paid == should_be_paid
                and record.notes == target_note
            ):
                continue

            record.status = target_status
            record.is_paid = should_be_paid
            record.notes = target_note
            record.save(auto_refresh_status=False, update_fields=["status", "is_paid", "notes", "updated_at"])


def rebalance_paid_leave_attendance() -> dict[str, int]:
    """Recalculate paid/unpaid attendance after a leave allocation change."""
    employee_years = set()
    leave_records = (
        AttendanceRecord.objects.filter(
            leave_request__status=LeaveStatus.APPROVED,
            leave_request__leave_type__in=LEAVE_ALLOCATION_FIELDS,
        ).values_list("employee_id", "date")
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
    affected_years = {record.date.year for record in existing_records}
    # A leave request can never create attendance before employment begins.
    requested_dates = {
        leave_date
        for leave_date in iter_dates(leave_request.start_date, leave_request.end_date)
        if (
            leave_date >= leave_request.employee.joining_date
            and leave_request.employee.is_attendance_eligible_on(leave_date)
        )
    }
    affected_years.update(day.year for day in requested_dates)

    if leave_request.status != LeaveStatus.APPROVED:
        deleted_count = 0
        updated_count = 0
        for record in existing_records:
            # A rejected half-day request must never erase an employee's punches.
            if leave_request.is_half_day and (record.check_in or record.check_out):
                record.leave_request = None
                record.is_paid = True
                record.refresh_status()
                record.save(auto_refresh_status=False, update_fields=["leave_request", "is_paid", "status", "updated_at"])
                updated_count += 1
            else:
                record.delete()
                deleted_count += 1
        for year in affected_years:
            _rebalance_yearly_paid_leaves(leave_request.employee, year)
        return {"created": 0, "updated": updated_count, "deleted": deleted_count}

    stale_records = existing_records.exclude(date__in=requested_dates)
    deleted_count, _ = stale_records.delete()

    created_count = 0
    updated_count = 0
    for leave_date in sorted(requested_dates):
        if leave_request.is_half_day:
            record, created = AttendanceRecord.objects.get_or_create(
                employee=leave_request.employee,
                date=leave_date,
                defaults={
                    "leave_request": leave_request,
                    "status": AttendanceStatus.HALF_DAY,
                    "is_paid": False,
                    "notes": f"Approved half-day leave request #{leave_request.id}; checkout required.",
                },
            )
            if not created:
                record.leave_request = leave_request
                if record.check_out:
                    record.status = AttendanceStatus.HALF_DAY
                record.save(auto_refresh_status=False, update_fields=["leave_request", "status", "updated_at"])
            created_count += int(created)
            updated_count += int(not created)
            continue

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

    for year in affected_years:
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
    employees = Employee.objects.filter(
        joining_date__lte=date(year, month, days_in_month),
    ).prefetch_related("status_history")

    for employee in employees:
        employment_start = max(employee.joining_date, date(year, month, 1))
        for holiday_date in holiday_dates:
            if (
                holiday_date < employment_start
                or not employee.is_attendance_eligible_on(holiday_date)
            ):
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
            if (
                sunday_date < employment_start
                or not employee.is_attendance_eligible_on(sunday_date)
            ):
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

    active_employees = Employee.objects.attendance_eligible_on(yesterday).filter(
        attendance_status_on_date__in=ATTENDANCE_WORKING_STATUSES,
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
