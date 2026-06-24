from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase

from attendance.models import AttendanceRecord, AttendanceStatus, LeaveRequest, LeaveStatus
from employees.models import Employee
from holidays.models import Holiday

from .services import calculate_attendance_payroll


def create_attendance(employee, day, status):
    record = AttendanceRecord(employee=employee, date=date(2026, 5, day), status=status)
    record.save(auto_refresh_status=False)
    return record


def create_employee(joining_date=date(2026, 5, 1)):
    return Employee.objects.create(
        employee_id="EMP-PAY-001",
        full_name="Payroll Employee",
        email="payroll@example.com",
        phone="9876543211",
        aadhaar_number="123456789013",
        department="Finance",
        designation="Analyst",
        annual_salary=120000,
        bank_name="Test Bank",
        bank_account_number="1234567891",
        tax_id="ABCDE1235F",
        joining_date=joining_date,
    )


class PayrollCalculationTests(TestCase):
    def test_attendance_statuses_drive_deductions_and_payable_salary(self):
        employee = create_employee()
        Holiday.objects.create(name="Foundation Day", date=date(2026, 5, 1))
        create_attendance(employee, 4, AttendanceStatus.PRESENT)
        create_attendance(employee, 5, AttendanceStatus.HALF_DAY)
        create_attendance(employee, 6, AttendanceStatus.LEAVE)
        create_attendance(employee, 7, AttendanceStatus.PAID_LEAVE)

        payroll = calculate_attendance_payroll(employee, 5, 2026)

        self.assertEqual(payroll["attendance_summary"]["present"], 1)
        self.assertEqual(payroll["attendance_summary"]["half_day"], 1)
        self.assertEqual(payroll["attendance_summary"]["leave"], 1)
        self.assertEqual(payroll["attendance_summary"]["paid_leave"], 1)
        self.assertEqual(payroll["attendance_summary"]["holiday"], 1)
        self.assertEqual(payroll["attendance_summary"]["sunday_unpaid"], 0)
        self.assertEqual(payroll["unpaid_days"], 1.5)
        self.assertEqual(payroll["deductions"], Decimal("483.87"))
        self.assertEqual(payroll["payable_salary"], Decimal("9516.13"))

    def test_paid_half_day_leave_has_no_salary_deduction(self):
        employee = create_employee()
        leave_request = LeaveRequest.objects.create(
            employee=employee,
            start_date=date(2026, 5, 5),
            end_date=date(2026, 5, 5),
            leave_type="CASUAL",
            is_half_day=True,
            reason="Personal work",
            status=LeaveStatus.APPROVED,
        )
        half_day_record = AttendanceRecord(
            employee=employee,
            date=date(2026, 5, 5),
            status=AttendanceStatus.HALF_DAY,
            is_paid=True,
            leave_request=leave_request,
        )
        half_day_record.save(auto_refresh_status=False)

        payroll = calculate_attendance_payroll(employee, 5, 2026)

        self.assertEqual(payroll["attendance_summary"]["half_day"], 1)
        self.assertEqual(payroll["unpaid_days"], 0.0)
        self.assertEqual(payroll["deductions"], Decimal("0.00"))

    @patch("payroll.services.timezone.localdate")
    def test_current_month_payroll_ignores_future_attendance_records(self, localdate_mock):
        localdate_mock.return_value = date(2026, 5, 30)
        employee = create_employee()
        create_attendance(employee, 30, AttendanceStatus.PRESENT)
        create_attendance(employee, 31, AttendanceStatus.ABSENT)

        payroll = calculate_attendance_payroll(employee, 5, 2026)

        self.assertEqual(payroll["attendance_summary"]["present"], 1)
        self.assertEqual(payroll["attendance_summary"]["absent"], 0)
        self.assertEqual(payroll["unpaid_days"], 0.0)
        self.assertEqual(payroll["deductions"], Decimal("0.00"))

    def test_first_month_salary_starts_on_the_joining_date(self):
        employee = create_employee(joining_date=date(2026, 5, 16))
        create_attendance(employee, 5, AttendanceStatus.ABSENT)
        create_attendance(employee, 16, AttendanceStatus.PRESENT)

        payroll = calculate_attendance_payroll(employee, 5, 2026)

        self.assertEqual(payroll["period_start"], date(2026, 5, 16))
        self.assertEqual(payroll["eligible_days"], 16)
        self.assertEqual(payroll["attendance_summary"]["absent"], 0)
        self.assertEqual(payroll["basic_salary"], Decimal("5161.29"))
        self.assertEqual(payroll["payable_salary"], Decimal("5161.29"))
