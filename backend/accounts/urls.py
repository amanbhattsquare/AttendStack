"""
accounts – URLs
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ChangePasswordView,
    CreateHRView,
    HealthCheckView,
    LoginView,
    UserProfileView,
)

app_name = "accounts"

urlpatterns = [
    # Auth
    path("login/", LoginView.as_view(), name="login"),
    path("login/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Profile
    path("profile/", UserProfileView.as_view(), name="profile"),
    path("profile/change-password/", ChangePasswordView.as_view(), name="change_password"),

    # Admin
    path("admin/create-hr/", CreateHRView.as_view(), name="create_hr"),

    # Health Check
    path("", HealthCheckView.as_view(), name="health_check"),
]