import calendar
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone

from attendance.models import AttendanceRecord, AttendanceStatus
from attendance.services import auto_mark_calendar_days


MONEY = Decimal("0.01")


def money(value: Decimal) -> Decimal:
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


def payroll_period_end(month: int, year: int) -> date:
    """Use completed days only for the current month; use full month for past months."""
    today = timezone.localdate()
    month_end = date(year, month, calendar.monthrange(year, month)[1])
    if year == today.year and month == today.month:
        return min(today, month_end)
    return month_end


def calculate_attendance_payroll(employee, month: int, year: int, allowances=0, manual_deductions=0) -> dict:
    auto_mark_calendar_days(month, year)

    monthly_salary = money(Decimal(str(employee.annual_salary or 0)) / Decimal("12"))
    allowances = money(Decimal(str(allowances or 0)))
    manual_deductions = money(Decimal(str(manual_deductions or 0)))
    days_in_month = calendar.monthrange(year, month)[1]
    period_end = payroll_period_end(month, year)
    month_start = date(year, month, 1)
    period_start = max(month_start, employee.joining_date)
    eligible_days = max((period_end - period_start).days + 1, 0) if period_start <= period_end else 0
    per_day_salary = monthly_salary / Decimal(str(days_in_month))
    basic_salary = money(per_day_salary * Decimal(str(eligible_days)))

    summary = {
        "present": 0,
        "late": 0,
        "absent": 0,
        "half_day": 0,
        "leave": 0,
        "paid_leave": 0,
        "holiday": 0,
        "sunday_unpaid": 0,
        "sunday_paid": 0,
    }
    unpaid_days = Decimal("0")

    records = AttendanceRecord.objects.filter(
        employee=employee,
        date__year=year,
        date__month=month,
        date__gte=period_start,
        date__lte=period_end,
    )

    deduction_details = {}
    attendance_deductions = Decimal("0")

    for record in records:
        if record.status == AttendanceStatus.PRESENT:
            summary["present"] += 1
        elif record.status == AttendanceStatus.LATE:
            summary["late"] += 1
        elif record.status == AttendanceStatus.ABSENT:
            summary["absent"] += 1
            unpaid_days += Decimal("1")
            attendance_deductions += per_day_salary
            deduction_details["Absent Day"] = deduction_details.get("Absent Day", Decimal("0")) + per_day_salary
        elif record.status == AttendanceStatus.HALF_DAY:
            summary["half_day"] += 1
            unpaid_days += Decimal("0.5")
            half_day_deduction = per_day_salary / 2
            attendance_deductions += half_day_deduction
            deduction_details["Half Day"] = deduction_details.get("Half Day", Decimal("0")) + half_day_deduction
        elif record.status == AttendanceStatus.LEAVE:
            summary["leave"] += 1
            unpaid_days += Decimal("1")
            attendance_deductions += per_day_salary
            deduction_details["Unpaid Leave"] = deduction_details.get("Unpaid Leave", Decimal("0")) + per_day_salary
        elif record.status == AttendanceStatus.PAID_LEAVE:
            summary["paid_leave"] += 1
        elif record.status == AttendanceStatus.HOLIDAY:
            summary["holiday"] += 1
        elif record.status == AttendanceStatus.SUNDAY_UNPAID:
            summary["sunday_unpaid"] += 1
            unpaid_days += Decimal("1")
            attendance_deductions += per_day_salary
            deduction_details["Unpaid Sunday"] = deduction_details.get("Unpaid Sunday", Decimal("0")) + per_day_salary
        elif record.status == AttendanceStatus.SUNDAY_PAID:
            summary["sunday_paid"] += 1

    attendance_deductions = money(attendance_deductions)
    deductions = money(attendance_deductions + manual_deductions)
    deduction_details = {
        reason: str(money(amount))
        for reason, amount in deduction_details.items()
    }
    if manual_deductions:
        deduction_details["Manual Adjustment"] = str(manual_deductions)

    payable_salary = money(basic_salary + allowances - deductions)
    
    return {
        "basic_salary": basic_salary,
        "allowances": allowances,
        "deductions": deductions,
        "deduction_details": deduction_details,
        "payable_salary": payable_salary,
        "unpaid_days": float(unpaid_days),
        "days_in_month": days_in_month,
        "eligible_days": eligible_days,
        "period_start": period_start,
        "period_end": period_end,
        "per_day_salary": money(per_day_salary),
        "attendance_summary": summary,
    }


def build_employee_payroll_summary(employee, month: int, year: int, request=None) -> dict:
    payroll = calculate_attendance_payroll(employee, month, year)
    avatar_url = None
    if employee.profile_photo:
        avatar_url = employee.profile_photo.url
        if request:
            avatar_url = request.build_absolute_uri(avatar_url)
    return {
        "id": employee.employee_id,
        "employee_uuid": employee.id,
        "name": employee.full_name,
        "email": employee.email,
        "avatar": avatar_url,
        "present": payroll["attendance_summary"]["present"],
        "late": payroll["attendance_summary"]["late"],
        "absent": payroll["attendance_summary"]["absent"],
        "halfDay": payroll["attendance_summary"]["half_day"],
        "leave": payroll["attendance_summary"]["leave"],
        "paidLeave": payroll["attendance_summary"]["paid_leave"],
        "holiday": payroll["attendance_summary"]["holiday"],
        "sundayPaid": payroll["attendance_summary"]["sunday_paid"],
        "sundayUnpaid": payroll["attendance_summary"]["sunday_unpaid"],
        "unpaidDays": payroll["unpaid_days"],
        "monthlySalary": payroll["basic_salary"],
        "deductions": payroll["deductions"],
        "payableSalary": payroll["payable_salary"],
        "daysInMonth": payroll["days_in_month"],
        "eligibleDays": payroll["eligible_days"],
        "periodStart": payroll["period_start"],
        "periodEnd": payroll["period_end"],
    }
