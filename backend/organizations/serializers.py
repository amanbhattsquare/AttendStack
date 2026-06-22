from rest_framework import serializers
from .models import Organization
from employees.models import Employee

class OrganizationSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.get_full_name", read_only=True)
    can_manage_invite_code = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "invite_code",
            "owner_name",
            "created_at",
            "is_active",
            "can_manage_invite_code",
        ]
        read_only_fields = ["id", "created_at", "owner_name", "invite_code"]

    def get_can_manage_invite_code(self, obj):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or obj.owner_id == request.user.id


class AdministratorSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = Employee
        fields = ('id', 'full_name', 'email', 'organization_name')
