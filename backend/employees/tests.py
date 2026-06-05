from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status as http_status
from rest_framework.test import APITestCase

from accounts.models import UserRole
from organizations.models import Organization
from .models import Employee, EmployeeStatus

User = get_user_model()


@override_settings(ROOT_URLCONF="employees.urls")
class EmployeeStatusActionTests(APITestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="AttendStack")
        self.admin_user = User.objects.create_superuser(
            email="admin@example.com",
            password="StrongPass123!",
        )
        self.employee = Employee.objects.create(
            organization=self.organization,
            full_name="Aarav Mehta",
            email="aarav@example.com",
            phone="9876543210",
            aadhaar_number="123456789012",
            department="Engineering",
            designation="Software Engineer",
            annual_salary="900000.00",
            bank_name="HDFC Bank",
            bank_account_number="1234567890",
            tax_id="ABCDE1234F",
        )
        self.employee_user = User.objects.create_user(
            email=self.employee.email,
            password="StrongPass123!",
            first_name="Aarav",
            last_name="Mehta",
            role=UserRole.EMPLOYEE,
            employee_id=self.employee.employee_id,
        )
        self.client.force_authenticate(self.admin_user)

    def test_status_action_updates_employee_and_disables_login(self):
        response = self.client.patch(
            f"/{self.employee.id}/status/",
            {"status": EmployeeStatus.TERMINATED},
            format="json",
        )

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.employee.refresh_from_db()
        self.employee_user.refresh_from_db()
        self.assertEqual(self.employee.status, EmployeeStatus.TERMINATED)
        self.assertFalse(self.employee_user.is_active)
        self.assertEqual(response.data["status"], EmployeeStatus.TERMINATED)
        self.assertEqual(response.data["status_label"], "Terminated")

    def test_status_action_rejects_invalid_status(self):
        response = self.client.patch(
            f"/{self.employee.id}/status/",
            {"status": "SUSPENDED"},
            format="json",
        )

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)

    def test_employee_email_update_also_updates_linked_login(self):
        response = self.client.patch(
            f"/{self.employee.id}/",
            {"email": "aarav.updated@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.employee.refresh_from_db()
        self.employee_user.refresh_from_db()
        self.assertEqual(self.employee.email, "aarav.updated@example.com")
        self.assertEqual(self.employee_user.email, "aarav.updated@example.com")

    def test_employee_email_update_rolls_back_when_login_email_conflicts(self):
        User.objects.create_user(
            email="existing@example.com",
            password="StrongPass123!",
            employee_id="EMP-OTHER",
        )

        response = self.client.patch(
            f"/{self.employee.id}/",
            {"email": "existing@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.employee.refresh_from_db()
        self.employee_user.refresh_from_db()
        self.assertEqual(self.employee.email, "aarav@example.com")
        self.assertEqual(self.employee_user.email, "aarav@example.com")
