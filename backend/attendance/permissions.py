from rest_framework.permissions import BasePermission, SAFE_METHODS
from accounts.models import UserRole


class IsAdminOrReadOnly(BasePermission):
    """
    Custom permission to only allow admins or HR to edit attendance records.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in (UserRole.SUPER_ADMIN, UserRole.HR) or request.user.is_staff