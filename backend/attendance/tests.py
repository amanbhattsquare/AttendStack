from datetime import date

from django.test import TestCase

from employees.models import Employee
from holidays.models import Holiday
from settings.models import SystemSettings

from .models import AttendanceRecord, AttendanceStatus, LeaveRequest, LeaveStatus
from .serializers import AttendanceRecordSerializer
from .services import auto_mark_calendar_days, sync_leave_request_attendance


def create_employee(email="employee@example.com", employee_id="EMP-TEST-001", aadhaar_number="123456789012"):
    return Employee.objects.create(
        employee_id=employee_id,
        full_name="Test Employee",
        email=email,
        phone="9876543210",
        aadhaar_number=aadhaar_number,
        department="Operations",
        designation="Associate",
        annual_salary=120000,
        bank_name="Test Bank",
        bank_account_number="1234567890",
        tax_id="ABCDE1234F",
        joining_date=date(2026, 1, 1),
    )


class AttendanceRecordSerializerTests(TestCase):
    def test_manual_status_is_preserved_without_punch_times(self):
        employee = create_employee()
        serializer = AttendanceRecordSerializer(
            data={
                "employee": str(employee.id),
                "date": date(2026, 5, 1).isoformat(),
                "status": AttendanceStatus.HALF_DAY,
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        record = serializer.save()

        self.assertEqual(record.status, AttendanceStatus.HALF_DAY)


class LeaveAttendanceSyncTests(TestCase):
    def setUp(self):
        self.employee = create_employee()
        settings = SystemSettings.get_settings()
        settings.monthly_paid_leave_days = 1
        settings.leave_carryover_enabled = False
        settings.max_carryover_days = 5
        settings.save()

    def test_approved_leave_marks_each_date_and_respects_monthly_paid_quota(self):
        leave_request = LeaveRequest.objects.create(
            employee=self.employee,
            start_date=date(2026, 5, 4),
            end_date=date(2026, 5, 6),
            reason="Family work",
            status=LeaveStatus.APPROVED,
        )

        result = sync_leave_request_attendance(leave_request)
        records = list(
            AttendanceRecord.objects.filter(employee=self.employee).order_by("date").values_list("date", "status", "is_paid")
        )

        self.assertEqual(result["created"], 3)
        self.assertEqual(
            records,
            [
                (date(2026, 5, 4), AttendanceStatus.PAID_LEAVE, True),
                (date(2026, 5, 5), AttendanceStatus.LEAVE, False),
                (date(2026, 5, 6), AttendanceStatus.LEAVE, False),
            ],
        )

    def test_monthly_paid_quota_resets_for_leave_spanning_multiple_months(self):
        leave_request = LeaveRequest.objects.create(
            employee=self.employee,
            start_date=date(2026, 5, 31),
            end_date=date(2026, 6, 1),
            reason="Travel",
            status=LeaveStatus.APPROVED,
        )

        sync_leave_request_attendance(leave_request)
        records = list(
            AttendanceRecord.objects.filter(employee=self.employee).order_by("date").values_list("date", "status", "is_paid")
        )

        self.assertEqual(
            records,
            [
                (date(2026, 5, 31), AttendanceStatus.PAID_LEAVE, True),
                (date(2026, 6, 1), AttendanceStatus.PAID_LEAVE, True),
            ],
        )

    def test_rejected_leave_removes_attendance_records_created_from_request(self):
        leave_request = LeaveRequest.objects.create(
            employee=self.employee,
            start_date=date(2026, 5, 4),
            end_date=date(2026, 5, 4),
            reason="Family work",
            status=LeaveStatus.APPROVED,
        )
        sync_leave_request_attendance(leave_request)

        leave_request.status = LeaveStatus.REJECTED
        result = sync_leave_request_attendance(leave_request)

        self.assertEqual(result["deleted"], 1)
        self.assertFalse(AttendanceRecord.objects.filter(employee=self.employee).exists())

    def test_unused_monthly_paid_leave_carries_forward_to_next_month(self):
        settings = SystemSettings.get_settings()
        settings.leave_carryover_enabled = True
        settings.max_carryover_days = 5
        settings.save()

        leave_request = LeaveRequest.objects.create(
            employee=self.employee,
            start_date=date(2026, 2, 2),
            end_date=date(2026, 2, 3),
            reason="Family work",
            status=LeaveStatus.APPROVED,
        )

        sync_leave_request_attendance(leave_request)
        records = list(
            AttendanceRecord.objects.filter(employee=self.employee).order_by("date").values_list("date", "status", "is_paid")
        )

        self.assertEqual(
            records,
            [
                (date(2026, 2, 2), AttendanceStatus.PAID_LEAVE, True),
                (date(2026, 2, 3), AttendanceStatus.PAID_LEAVE, True),
            ],
        )


class EmploymentStartAttendanceTests(TestCase):
    def setUp(self):
        self.employee = create_employee()
        settings = SystemSettings.get_settings()
        settings.monthly_paid_leave_days = 1
        settings.leave_carryover_enabled = False
        settings.max_carryover_days = 5
        settings.save()

    def test_calendar_records_start_on_the_employee_joining_date(self):
        employee = create_employee(
            email="new.joiner@example.com",
            employee_id="EMP-NEW-001",
            aadhaar_number="123456789013",
        )
        employee.joining_date = date(2026, 5, 16)
        employee.save(update_fields=["joining_date"])
        Holiday.objects.create(name="Early Month Holiday", date=date(2026, 5, 1))

        auto_mark_calendar_days(5, 2026)

        records = AttendanceRecord.objects.filter(employee=employee)
        self.assertFalse(records.filter(date__lt=employee.joining_date).exists())
        self.assertTrue(records.filter(date=date(2026, 5, 17), status=AttendanceStatus.SUNDAY_PAID).exists())

    def test_carry_forward_respects_max_carryover_days(self):
        settings = SystemSettings.get_settings()
        settings.monthly_paid_leave_days = 2
        settings.leave_carryover_enabled = True
        settings.max_carryover_days = 1
        settings.save()

        leave_request = LeaveRequest.objects.create(
            employee=self.employee,
            start_date=date(2026, 2, 2),
            end_date=date(2026, 2, 5),
            reason="Family work",
            status=LeaveStatus.APPROVED,
        )

        sync_leave_request_attendance(leave_request)
        records = list(
            AttendanceRecord.objects.filter(employee=self.employee).order_by("date").values_list("date", "status", "is_paid")
        )

        self.assertEqual(
            records,
            [
                (date(2026, 2, 2), AttendanceStatus.PAID_LEAVE, True),
                (date(2026, 2, 3), AttendanceStatus.PAID_LEAVE, True),
                (date(2026, 2, 4), AttendanceStatus.PAID_LEAVE, True),
                (date(2026, 2, 5), AttendanceStatus.LEAVE, False),
            ],
        )


from rest_framework.test import APITestCase
from django.urls import reverse
from rest_framework import status

class GeofenceBypassTests(APITestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(
            email="employee@example.com",
            password="testpassword",
            employee_id="EMP-TEST-001"
        )
        self.employee = create_employee(email="employee@example.com", employee_id="EMP-TEST-001")
        self.settings = SystemSettings.get_settings()
        self.settings.geofencing_enabled = True
        self.settings.office_latitude = 26.8342
        self.settings.office_longitude = 80.9862
        self.settings.geofence_radius = 100
        self.settings.ip_restriction_enabled = False
        self.settings.allowed_ip_ranges = ""
        self.settings.save()
        self.client.force_authenticate(user=self.user)

    def test_geofence_fails_when_far_away(self):
        # Coordinates for a place far away
        url = reverse("attendance:attendance-check-in")
        response = self.client.post(url, {"latitude": 30.0, "longitude": 80.9862})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Location check failed", response.data["detail"])
        self.assertEqual(response.data["code"], "OUTSIDE_GEOFENCE")

    def test_geofence_bypassed_when_ip_is_whitelisted(self):
        self.settings.ip_restriction_enabled = True
        self.settings.allowed_ip_ranges = "192.168.1.1, 10.0.0.1"
        self.settings.save()

        url = reverse("attendance:attendance-check-in")
        # Post coordinate that is far away, but mock client IP to be 10.0.0.1
        response = self.client.post(
            url, 
            {"latitude": 30.0, "longitude": 80.9862},
            REMOTE_ADDR="10.0.0.1"
        )
        # It should bypass geofencing and succeed!
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_location_match_allows_check_in_when_ip_and_geofence_are_enabled(self):
        self.settings.ip_restriction_enabled = True
        self.settings.allowed_ip_ranges = "10.0.0.1"
        self.settings.save()

        url = reverse("attendance:attendance-check-in")
        response = self.client.post(
            url,
            {"latitude": 26.8342, "longitude": 80.9862, "accuracy": 20},
            REMOTE_ADDR="203.0.113.10",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_geofence_only_does_not_bypass_from_stale_allowed_ip(self):
        self.settings.ip_restriction_enabled = False
        self.settings.allowed_ip_ranges = "10.0.0.1"
        self.settings.save()

        url = reverse("attendance:attendance-check-in")
        response = self.client.post(
            url,
            {"latitude": 30.0, "longitude": 80.9862},
            REMOTE_ADDR="10.0.0.1",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "OUTSIDE_GEOFENCE")
