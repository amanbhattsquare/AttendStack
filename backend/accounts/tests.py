import re
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import PasswordResetOTP


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    PASSWORD_RESET_OTP_RESEND_SECONDS=0,
)
class PasswordResetOTPTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="employee@example.com",
            password="OldStrongPassword123!",
            first_name="Test",
            last_name="Employee",
        )

    def request_code(self):
        return self.client.post(
            reverse("accounts:password_reset_request"),
            {"email": self.user.email},
            format="json",
        )

    def get_code(self):
        return re.search(r"\b\d{6}\b", mail.outbox[-1].body).group(0)

    def test_request_sends_code_for_existing_active_account(self):
        response = self.request_code()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(
            response.data["detail"],
            "A verification code has been sent to your email address.",
        )
        self.assertEqual(
            mail.outbox[0].subject,
            "[AttendStack Security] Password reset verification code",
        )
        self.assertIn("AttendStack Security Team", mail.outbox[0].body)
        self.assertIn("IP address:", mail.outbox[0].body)
        self.assertIn("never share this code", mail.outbox[0].body)
        self.assertEqual(len(mail.outbox[0].alternatives), 1)
        self.assertEqual(mail.outbox[0].alternatives[0].mimetype, "text/html")
        self.assertIn("Security notification", mail.outbox[0].alternatives[0].content)
        self.assertEqual(PasswordResetOTP.objects.filter(user=self.user).count(), 1)

    def test_unknown_email_returns_account_not_found_error(self):
        response = self.client.post(
            reverse("accounts:password_reset_request"),
            {"email": "missing@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["email"][0],
            "No active account was found with this email address.",
        )
        self.assertEqual(len(mail.outbox), 0)

    def test_inactive_account_returns_account_not_found_error(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.request_code()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)
        self.assertEqual(len(mail.outbox), 0)

    @patch("accounts.services._send_password_reset_email")
    def test_email_delivery_failure_returns_error_and_invalidates_code(self, send_email):
        send_email.side_effect = OSError("SMTP unavailable")

        response = self.request_code()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("could not send", response.data["email"][0])
        self.assertTrue(PasswordResetOTP.objects.get(user=self.user).is_used)

    def test_valid_code_resets_password_and_cannot_be_reused(self):
        self.request_code()
        payload = {
            "email": self.user.email,
            "otp": self.get_code(),
            "new_password": "NewStrongPassword456!",
            "confirm_password": "NewStrongPassword456!",
        }

        response = self.client.post(
            reverse("accounts:password_reset_confirm"),
            payload,
            format="json",
        )
        reused_response = self.client.post(
            reverse("accounts:password_reset_confirm"),
            payload,
            format="json",
        )

        self.user.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(self.user.check_password(payload["new_password"]))
        self.assertEqual(reused_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_passwords_must_match(self):
        response = self.client.post(
            reverse("accounts:password_reset_confirm"),
            {
                "email": self.user.email,
                "otp": "123456",
                "new_password": "NewStrongPassword456!",
                "confirm_password": "DifferentStrongPassword789!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("confirm_password", response.data)
