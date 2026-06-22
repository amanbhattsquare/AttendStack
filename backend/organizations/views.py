from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from accounts.models import UserRole
from accounts.permissions import IsAdminOrHR, IsSuperAdmin
from .models import Organization
from .serializers import OrganizationSerializer, AdministratorSerializer
from employees.models import Employee

class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsAdminOrHR()]
        if self.action == "destroy":
            return [IsSuperAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Organization.objects.all()
        if user.role == UserRole.HR:
            return (Organization.objects.filter(owner=user) | Organization.objects.filter(
                employees__email__iexact=user.email
            )).distinct()
        return Organization.objects.none()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        organization = self.get_object()
        if not (self.request.user.is_superuser or organization.owner_id == self.request.user.id):
            raise PermissionDenied("Only the organization owner can change organization settings.")
        serializer.save()

    @action(detail=True, methods=["post"], url_path="regenerate-invite-code")
    def regenerate_invite_code(self, request, pk=None):
        organization = self.get_object()
        if not (request.user.is_superuser or organization.owner_id == request.user.id):
            raise PermissionDenied("Only the organization owner can regenerate its invite code.")

        from .models import generate_invite_code

        while True:
            invite_code = generate_invite_code()
            if not Organization.objects.filter(invite_code=invite_code).exists():
                organization.invite_code = invite_code
                organization.save(update_fields=["invite_code"])
                break
        return Response(OrganizationSerializer(organization).data)

class AdministratorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Employee.objects.filter(designation="Administrator")
    serializer_class = AdministratorSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        user = self.request.user
        queryset = Employee.objects.filter(designation="Administrator")
        if user.is_superuser:
            return queryset
        return queryset.filter(organization__owner=user)
