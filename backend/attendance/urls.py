from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AttendanceRecordViewSet

app_name = "attendance"

router = DefaultRouter()
router.register("", AttendanceRecordViewSet, basename="attendance")

urlpatterns = [
    path("", include(router.urls)),
]
