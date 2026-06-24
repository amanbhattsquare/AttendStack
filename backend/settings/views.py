from django.db import transaction
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from rest_framework.parsers import JSONParser, MultiPartParser, FormParser

from .models import SystemSettings, SettingsChangeLog
from .serializers import SystemSettingsSerializer, SystemSettingsUpdateSerializer, SettingsChangeLogSerializer
from accounts.permissions import IsAdminOrHR
from employees.models import Employee


class SystemSettingsView(generics.RetrieveUpdateAPIView):
    """
    API endpoint to view and update system settings
    GET: Returns current system settings (all authenticated users)
    PUT/PATCH: Updates system settings (only admins)
    """
    serializer_class = SystemSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def get_object(self):
        return SystemSettings.get_settings()
    
    def update(self, request, *args, **kwargs):
        # Only allow admins to update settings
        if not IsAdminOrHR().has_permission(request, self):
            raise PermissionDenied("Only admins can modify system settings")
            
        instance = self.get_object()
        serializer = SystemSettingsUpdateSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Log all changes for audit trail
        with transaction.atomic():
            changes = []
            for field, new_value in request.data.items():
                if hasattr(instance, field):
                    old_value = str(getattr(instance, field))
                    if old_value != str(new_value):
                        changes.append(
                            SettingsChangeLog(
                                settings=instance,
                                changed_by=request.user.employee if hasattr(request.user, 'employee') else None,
                                field_name=field,
                                old_value=old_value,
                                new_value=str(new_value),
                                ip_address=request.META.get('REMOTE_ADDR')
                            )
                        )
            
            paid_leave_policy_fields = {
                "casual_leave_days",
                "sick_leave_days",
                "maternity_leave_days",
                "paternity_leave_days",
                "bereavement_leave_days",
                "marriage_leave_days",
            }
            should_rebalance_paid_leaves = any(
                change.field_name in paid_leave_policy_fields for change in changes
            )

            # Bulk create change logs
            if changes:
                SettingsChangeLog.objects.bulk_create(changes)
            
            # Update the instance
            instance.updated_by = request.user.employee if hasattr(request.user, 'employee') else None
            serializer.save()

            if should_rebalance_paid_leaves:
                from attendance.services import rebalance_paid_leave_attendance

                rebalance_paid_leave_attendance()
            
        return Response(serializer.data)


class SettingsChangeLogsView(generics.ListAPIView):
    """
    API endpoint to view settings change history (audit log)
    Only accessible by admins
    """
    serializer_class = SettingsChangeLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrHR]
    queryset = SettingsChangeLog.objects.all().order_by('-changed_at')
    
    def get_queryset(self):
        return super().get_queryset()[:100]  # Limit to last 100 changes
