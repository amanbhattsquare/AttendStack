"""
accounts – views
Login, profile, and user management views
"""

import hashlib
import hmac
from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import UserRole
from .permissions import IsSuperAdmin
from .serializers import (
    ChangePasswordSerializer,
    CreateHRSerializer,
    CustomTokenObtainPairSerializer,
    RequestPasswordResetOTPSerializer,
    ResetPasswordWithOTPSerializer,
    SimplyJobEmployeeOnboardingSerializer,
    EmployeeSelfRegistrationSerializer,
    OrganizationRegistrationSerializer,
    UserProfileSerializer,
    UserUpdateSerializer,
)
from .services import request_password_reset_otp, reset_password_with_otp
from employees.services import sync_employee_from_simplyjob

User = get_user_model()


# ──────────────────────────────────────────────────────────────────────────────
# Auth Views
# ──────────────────────────────────────────────────────────────────────────────
class LoginView(TokenObtainPairView):
    """
    Login with email and password.
    Returns access/refresh token pair + user profile.
    """
    serializer_class = CustomTokenObtainPairSerializer


class OrganizationRegistrationView(generics.CreateAPIView):
    """Public organization setup. The created account is the organization's HR owner."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = OrganizationRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        organization = serializer.save()
        return Response(
            {
                "detail": "Organization created successfully.",
                "organization": {
                    "id": organization.id,
                    "name": organization.name,
                    "invite_code": organization.invite_code,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class EmployeeSelfRegistrationView(generics.CreateAPIView):
    """Public employee account registration using an organization invite code."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = EmployeeSelfRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee = serializer.save()
        return Response(
            {
                "detail": "Your employee account has been created. You can now sign in.",
                "employee": {
                    "employee_id": employee.employee_id,
                    "full_name": employee.full_name,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class OrganizationCodeLookupView(APIView):
    """Confirm the organization attached to an employee onboarding code."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        code = str(request.query_params.get("code", "")).strip().upper()
        if not code:
            return Response(
                {"detail": "Enter an organization code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from organizations.models import Organization

        organization = Organization.objects.filter(
            invite_code__iexact=code,
            is_active=True,
        ).only("name").first()
        if organization is None:
            return Response(
                {"detail": "Enter a valid active organization code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"organization_name": organization.name})


class RequestPasswordResetOTPView(APIView):
    """Email a password-reset verification code."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = RequestPasswordResetOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = request_password_reset_otp(
            serializer.validated_data["email"],
            requested_ip=request.META.get("REMOTE_ADDR"),
        )
        return Response({"detail": message}, status=status.HTTP_200_OK)


class ResetPasswordWithOTPView(APIView):
    """Set a new password using a valid verification code."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = ResetPasswordWithOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reset_password_with_otp(
            serializer.validated_data["email"],
            serializer.validated_data["otp"],
            serializer.validated_data["new_password"],
        )
        return Response(
            {"detail": "Password reset successfully. You can now sign in."},
            status=status.HTTP_200_OK,
        )


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    GET: Retrieve the authenticated user's profile.
    PUT/PATCH: Update the authenticated user's profile.
    """
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return UserUpdateSerializer
        return self.serializer_class


class ChangePasswordView(generics.UpdateAPIView):
    """
    Update the authenticated user's password.
    """
    serializer_class = ChangePasswordSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)


class AdminLiveStatusView(APIView):
    """
    Returns the most recently active admin/HR account for employee dashboards.
    Admin/HR requests also refresh their activity heartbeat.
    """

    permission_classes = [permissions.IsAuthenticated]
    online_window = timedelta(minutes=5)

    def get(self, request, *args, **kwargs):
        now = timezone.now()

        if request.user.role in (UserRole.SUPER_ADMIN, UserRole.HR):
            request.user.last_login = now
            request.user.save(update_fields=["last_login"])

        admin_user = (
            User.objects.filter(
                role__in=(UserRole.SUPER_ADMIN, UserRole.HR),
                is_active=True,
                last_login__isnull=False,
            )
            .order_by("-last_login")
            .first()
        )

        if admin_user is None:
            admin_user = (
                User.objects.filter(
                    role__in=(UserRole.SUPER_ADMIN, UserRole.HR),
                    is_active=True,
                )
                .order_by("date_joined")
                .first()
            )

        if admin_user is None:
            return Response(
                {
                    "is_online": False,
                    "last_seen_at": None,
                    "name": "Admin",
                    "role": "Admin",
                }
            )

        last_seen = admin_user.last_login
        is_online = bool(last_seen and now - last_seen <= self.online_window)

        return Response(
            {
                "is_online": is_online,
                "last_seen_at": last_seen,
                "name": admin_user.get_full_name() or admin_user.email,
                "role": admin_user.get_role_display(),
            }
        )


# ──────────────────────────────────────────────────────────────────────────────
# Admin Views
# ──────────────────────────────────────────────────────────────────────────────
class CreateHRView(generics.CreateAPIView):
    """
    SUPER_ADMIN creates a new HR manager.
    Provides the initial password in the response.
    """
    queryset = User.objects.none()
    serializer_class = CreateHRSerializer
    permission_classes = [IsSuperAdmin]

    def perform_create(self, serializer):
        # The serializer handles user creation and password generation
        self.created_user = serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Return the user's details and their temporary password
        user_data = UserProfileSerializer(self.created_user).data
        response_data = {
            "user": user_data,
            "temp_password": self.created_user._raw_password,
        }
        headers = self.get_success_headers(serializer.data)
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)


class SimplyJobEmployeeOnboardingView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        secret = getattr(settings, "SIMPLYJOB_ONBOARDING_SECRET", "").strip()
        if not secret:
            raise AuthenticationFailed("Onboarding secret is not configured.")

        raw_body = request.body or b""
        signature = str(request.headers.get("X-SimplyJob-Signature", "")).strip()
        expected_signature = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
        if not signature or not hmac.compare_digest(signature, expected_signature):
            raise AuthenticationFailed("Invalid onboarding signature.")

        serializer = SimplyJobEmployeeOnboardingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        organization, employee, user, temporary_password = sync_employee_from_simplyjob(
            company_data=serializer.validated_data,
            employee_data=serializer.validated_data,
        )
        join_base = getattr(settings, "ATTENDSTACK_APP_URL", "").strip().rstrip("/")
        join_url = ""
        if join_base:
            query = urlencode({"email": employee.email})
            join_url = f"{join_base}/sign-in?{query}"

        return Response(
            {
                "detail": "Employee synced successfully.",
                "organization": {
                    "id": organization.id,
                    "name": organization.name,
                    "invite_code": organization.invite_code,
                },
                "employee": {
                    "id": str(employee.id),
                    "employee_id": employee.employee_id,
                    "full_name": employee.full_name,
                    "email": employee.email,
                    "status": employee.status,
                    "joining_date": employee.joining_date,
                },
                "user": {
                    "id": str(user.id) if user else None,
                    "email": user.email if user else employee.email,
                    "temporary_password": temporary_password,
                },
                "join_url": join_url,
            },
            status=status.HTTP_201_CREATED if temporary_password else status.HTTP_200_OK,
        )


class HealthCheckView(APIView):
    """
    Check the health of the application.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        return Response({"status": "ok"})
