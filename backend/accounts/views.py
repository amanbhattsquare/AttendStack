"""
accounts – views
Login, profile, and user management views
"""

from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .permissions import IsSuperAdmin
from .serializers import (
    ChangePasswordSerializer,
    CreateHRSerializer,
    CustomTokenObtainPairSerializer,
    UserProfileSerializer,
    UserUpdateSerializer,
)

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