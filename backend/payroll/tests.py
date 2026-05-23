from datetime import date
from decimal import Decimal

from django.test import TestCase

from attendance.models import AttendanceRecord, AttendanceStatus
from employees.models import Employee
from holidays.models import Holiday

from .services import calculate_attendance_payroll


def create_attendance(employee, day, status):
    record = AttendanceRecord(employee=employee, date=date(2026, 5, day), status=status)
    record.save(auto_refresh_status=False)
    return record


def create_employee():
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
        self.assertEqual(payroll["attendance_summary"]["sunday_unpaid"], 5)
        self.assertEqual(payroll["unpaid_days"], 6.5)
        self.assertEqual(payroll["deductions"], Decimal("2096.77"))
        self.assertEqual(payroll["payable_salary"], Decimal("7903.23"))
