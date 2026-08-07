"""
accounts – URLs
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminLiveStatusView,
    ChangePasswordView,
    CreateHRView,
    EmployeeSelfRegistrationView,
    HealthCheckView,
    LoginView,
    OrganizationCodeLookupView,
    OrganizationRegistrationView,
    RequestPasswordResetOTPView,
    ResetPasswordWithOTPView,
    SimplyJobEmployeeOnboardingView,
    UserProfileView,
)

app_name = "accounts"

urlpatterns = [
    # Auth
    path("login/", LoginView.as_view(), name="login"),
    path("register-organization/", OrganizationRegistrationView.as_view(), name="register_organization"),
    path("register-employee/", EmployeeSelfRegistrationView.as_view(), name="register_employee"),
    path("organization-code/", OrganizationCodeLookupView.as_view(), name="organization_code_lookup"),
    path("login/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path(
        "password-reset/request/",
        RequestPasswordResetOTPView.as_view(),
        name="password_reset_request",
    ),
    path(
        "password-reset/confirm/",
        ResetPasswordWithOTPView.as_view(),
        name="password_reset_confirm",
    ),

    # Profile
    path("profile/", UserProfileView.as_view(), name="profile"),
    path("profile/change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("admin-live-status/", AdminLiveStatusView.as_view(), name="admin_live_status"),

    # Admin
    path("admin/create-hr/", CreateHRView.as_view(), name="create_hr"),
    path("integrations/simplyjob/onboard/", SimplyJobEmployeeOnboardingView.as_view(), name="simplyjob_onboard"),

    # Health Check
    path("", HealthCheckView.as_view(), name="health_check"),
]
