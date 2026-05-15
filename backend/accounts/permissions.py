"""
accounts – permissions
Custom DRF permission classes for role-based access control.
"""

from rest_framework.permissions import BasePermission
from accounts.models import UserRole


class IsSuperAdmin(BasePermission):
    """Only SUPER_ADMIN users."""
    message = "Access restricted to Super Admins only."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.SUPER_ADMIN
        )


class IsHR(BasePermission):
    """Only HR Managers."""
    message = "Access restricted to HR Managers only."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.HR
        )


class IsAdminOrHR(BasePermission):
    """SUPER_ADMIN or HR Managers."""
    message = "Access restricted to Admin or HR roles."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (UserRole.SUPER_ADMIN, UserRole.HR)
        )


class IsEmployee(BasePermission):
    """Only regular Employees."""
    message = "Access restricted to Employees."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.EMPLOYEE
        )


class IsOwnerOrAdminOrHR(BasePermission):
    """
    Object-level: the resource owner, any HR, or any Super Admin may access.
    Attach `user` field on the object for ownership check.
    """

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in (UserRole.SUPER_ADMIN, UserRole.HR):
            return True
        owner = getattr(obj, "user", None) or getattr(obj, "employee", None)
        if owner is not None:
            user_obj = getattr(owner, "user", owner)
            return user_obj == request.user
        return False
