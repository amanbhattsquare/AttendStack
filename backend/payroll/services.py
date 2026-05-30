import calendar
from decimal import Decimal, ROUND_HALF_UP

from attendance.models import AttendanceRecord, AttendanceStatus
from attendance.services import auto_mark_calendar_days


MONEY = Decimal("0.01")


def money(value: Decimal) -> Decimal:
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


def calculate_attendance_payroll(employee, month: int, year: int, allowances=0, deductions=0) -> dict:
    auto_mark_calendar_days(month, year)

    basic_salary = money(Decimal(str(employee.annual_salary or 0)) / Decimal("12"))
    allowances = money(Decimal(str(allowances or 0)))
    days_in_month = calendar.monthrange(year, month)[1]
    per_day_salary = basic_salary / Decimal(str(days_in_month))

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
    )

    deduction_details = {}

    for record in records:
        if record.status == AttendanceStatus.PRESENT:
            summary["present"] += 1
        elif record.status == AttendanceStatus.LATE:
            summary["late"] += 1
        elif record.status == AttendanceStatus.ABSENT:
            summary["absent"] += 1
            unpaid_days += Decimal("1")
            deduction_details["Absent Day"] = deduction_details.get("Absent Day", 0) + per_day_salary
        elif record.status == AttendanceStatus.HALF_DAY:
            summary["half_day"] += 1
            unpaid_days += Decimal("0.5")
            deduction_details["Half Day"] = deduction_details.get("Half Day", 0) + (per_day_salary / 2)
        elif record.status == AttendanceStatus.LEAVE:
            summary["leave"] += 1
            unpaid_days += Decimal("1")
            deduction_details["Unpaid Leave"] = deduction_details.get("Unpaid Leave", 0) + per_day_salary
        elif record.status == AttendanceStatus.PAID_LEAVE:
            summary["paid_leave"] += 1
        elif record.status == AttendanceStatus.HOLIDAY:
            summary["holiday"] += 1
        elif record.status == AttendanceStatus.SUNDAY_UNPAID:
            summary["sunday_unpaid"] += 1
            unpaid_days += Decimal("1")
            deduction_details["Unpaid Sunday"] = deduction_details.get("Unpaid Sunday", 0) + per_day_salary
        elif record.status == AttendanceStatus.SUNDAY_PAID:
            summary["sunday_paid"] += 1

    # Use Decimal for financial calculations to avoid floating-point errors
    deductions = money(Decimal(str(deductions or 0)))
    payable_salary = money(basic_salary + allowances - deductions)
    
    return {
        "basic_salary": basic_salary,
        "allowances": allowances,
        "deductions": deductions,
        "deduction_details": deduction_details,
        "payable_salary": payable_salary,
        "unpaid_days": float(unpaid_days),
        "days_in_month": days_in_month,
        "per_day_salary": money(per_day_salary),
        "attendance_summary": summary,
    }