from django.urls import path
from .views import SystemSettingsView, SettingsChangeLogsView

urlpatterns = [
    path('settings/', SystemSettingsView.as_view(), name='system-settings'),
    path('settings/logs/', SettingsChangeLogsView.as_view(), name='settings-change-logs'),
]