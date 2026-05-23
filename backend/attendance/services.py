import calendar
from datetime import date, timedelta

from employees.models import Employee, EmployeeStatus
from holidays.models import Holiday

from .models import AttendanceRecord, AttendanceStatus


def auto_mark_calendar_days(month: int, year: int) -> dict[str, int]:
    """Create missing holiday and Sunday attendance records for active employees."""
    days_in_month = calendar.monthrange(year, month)[1]
    all_dates = [date(year, month, day) for day in range(1, days_in_month + 1)]
    holiday_dates = set(
        Holiday.objects.filter(date__year=year, date__month=month).values_list("date", flat=True)
    )
    sunday_dates = {day for day in all_dates if day.weekday() == 6} - holiday_dates

    created_count = 0
    skipped_count = 0
    active_employees = Employee.objects.filter(status=EmployeeStatus.ACTIVE)

    for employee in active_employees:
        for holiday_date in holiday_dates:
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
            _, created = AttendanceRecord.objects.get_or_create(
                employee=employee,
                date=sunday_date,
                defaults={
                    "status": AttendanceStatus.SUNDAY_PAID,
                    "notes": "Auto-marked: Sunday (Paid)",
                },
            )
            created_count += int(created)
            skipped_count += int(not created)

    return {"created": created_count, "skipped": skipped_count}


def auto_mark_absent_yesterday():
    """Marks active employees as 'Absent' if they have no attendance record for yesterday."""
    yesterday = date.today() - timedelta(days=1)
    
    # Skip execution on weekends and holidays
    if yesterday.weekday() >= 5: # Saturday or Sunday
        return {"status": "skipped", "reason": "Weekend"}
        
    if Holiday.objects.filter(date=yesterday).exists():
        return {"status": "skipped", "reason": "Holiday"}

    active_employees = Employee.objects.filter(status=EmployeeStatus.ACTIVE)
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