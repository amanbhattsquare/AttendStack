from rest_framework import serializers
from django.utils import timezone
from .models import Organization
from employees.models import Employee, EmployeeStatus
from attendance.models import AttendanceRecord

class OrganizationSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.get_full_name", read_only=True)
    owner_email = serializers.CharField(source="owner.email", read_only=True)
    can_manage_invite_code = serializers.SerializerMethodField()
    employee_count = serializers.SerializerMethodField()
    active_employee_count = serializers.SerializerMethodField()
    today_attendance_count = serializers.SerializerMethodField()
    is_simplyjob_linked = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "invite_code",
            "external_company_id",
            "external_source",
            "api_key",
            "phone",
            "email",
            "website",
            "location",
            "industry",
            "plan_name",
            "is_simplyjob_linked",
            "owner",
            "owner_name",
            "owner_email",
            "created_at",
            "is_active",
            "can_manage_invite_code",
            "employee_count",
            "active_employee_count",
            "today_attendance_count",
        ]
        read_only_fields = ["id", "created_at", "owner_name", "owner_email", "invite_code"]

    def get_is_simplyjob_linked(self, obj):
        return bool(obj.external_company_id or obj.external_source == "SIMPLYJOB")

    def get_can_manage_invite_code(self, obj):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or request.user.role == "SUPER_ADMIN" or obj.owner_id == request.user.id

    def get_employee_count(self, obj):
        return obj.employees.count()

    def get_active_employee_count(self, obj):
        return obj.employees.filter(status=EmployeeStatus.ACTIVE).count()

    def get_today_attendance_count(self, obj):
        today = timezone.localdate()
        return AttendanceRecord.objects.filter(employee__organization=obj, date=today, status__in=["PRESENT", "LATE", "HALF_DAY"]).count()


class AdministratorSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = Employee
        fields = ('id', 'full_name', 'email', 'organization_name')

