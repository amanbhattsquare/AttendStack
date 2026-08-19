from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrganizationViewSet,
    AdministratorViewSet,
    OrganizationVerifyCodeView,
    OrganizationVerifyApiKeyView,
)

router = DefaultRouter()
router.register(r"organizations", OrganizationViewSet)
router.register(r"administrators", AdministratorViewSet)

urlpatterns = [
    path("organizations/verify-code/", OrganizationVerifyCodeView.as_view(), name="organization-verify-code"),
    path("organizations/verify-api-key/", OrganizationVerifyApiKeyView.as_view(), name="organization-verify-api-key"),
    path("", include(router.urls)),
]