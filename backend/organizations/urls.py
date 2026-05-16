from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, AdministratorViewSet

router = DefaultRouter()
router.register(r"organizations", OrganizationViewSet)
router.register(r"administrators", AdministratorViewSet)

urlpatterns = [
    path("", include(router.urls)),
]