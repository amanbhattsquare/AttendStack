from rest_framework import serializers
from .models import Organization
from employees.models import Employee

class OrganizationSerializer(serializers.ModelSerializer):
    admin_full_name = serializers.CharField(write_only=True)
    admin_email = serializers.EmailField(write_only=True)
    admin_password = serializers.CharField(write_only=True)
    administrator = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "created_at",
            "is_active",
            "admin_full_name",
            "admin_email",
            "admin_password",
            "administrator",
        ]
        read_only_fields = ["id", "created_at", "is_active", "administrator"]

    def get_administrator(self, obj):
        try:
            # Assuming the first employee created for an organization is the admin
            admin_employee = Employee.objects.filter(organization=obj, designation="Administrator").first()
            if admin_employee:
                return {
                    "full_name": admin_employee.full_name,
                    "email": admin_employee.email,
                }
        except Employee.DoesNotExist:
            return None
        return None


class AdministratorSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = Employee
        fields = ('id', 'full_name', 'email', 'organization_name')