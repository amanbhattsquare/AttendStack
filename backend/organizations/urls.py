from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, AdministratorViewSet, OrganizationVerifyCodeView

router = DefaultRouter()
router.register(r"organizations", OrganizationViewSet)
router.register(r"administrators", AdministratorViewSet)

urlpatterns = [
    path("organizations/verify-code/", OrganizationVerifyCodeView.as_view(), name="organization-verify-code"),
    path("", include(router.urls)),
]