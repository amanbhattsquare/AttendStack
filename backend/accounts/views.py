"""
accounts – views
Login, profile, and user management views
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, status, permissions
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
    UserProfileSerializer,
    UserUpdateSerializer,
)
from .services import request_password_reset_otp, reset_password_with_otp

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


class HealthCheckView(APIView):
    """
    Check the health of the application.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        return Response({"status": "ok"})
