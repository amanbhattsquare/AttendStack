from rest_framework import serializers
from .models import Payroll
from employees.models import Employee

class EmployeeMiniSerializer(serializers.ModelSerializer):
    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = ["id", "employee_id", "full_name", "email", "department", "designation", "profile_photo_url"]

    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.profile_photo.url)
            return obj.profile_photo.url
        return None

class PayrollSerializer(serializers.ModelSerializer):
    employee_details = EmployeeMiniSerializer(source="employee", read_only=True)
    employee_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        source="employee",
        write_only=True
    )
    month_name = serializers.SerializerMethodField()

    class Meta:
        model = Payroll
        fields = [
            "id",
            "employee_id",
            "employee_details",
            "month",
            "year",
            "month_name",
            "basic_salary",
            "allowances",
            "deductions",
            "net_salary",
            "status",
            "paid_on",
            "created_at",
            "updated_at"
        ]

    def get_month_name(self, obj):
        import calendar
        try:
            return calendar.month_name[obj.month]
        except (IndexError, TypeError):
            return ""
