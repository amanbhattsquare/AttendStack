from decimal import Decimal
from rest_framework import serializers
from .models import Payroll
from employees.models import Employee

class EmployeeMiniSerializer(serializers.ModelSerializer):
    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = ["id", "employee_id", "full_name", "email", "department", "designation", "annual_salary", "profile_photo_url"]

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
    payable_salary = serializers.SerializerMethodField()
    attendance_summary = serializers.SerializerMethodField()

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
            "deduction_details",
            "net_salary",
            "payable_salary",
            "attendance_summary",
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

    def get_payable_salary(self, obj):
        return obj.net_salary

    def get_attendance_summary(self, obj):
        from .services import calculate_attendance_payroll

        payroll = calculate_attendance_payroll(
            obj.employee,
            obj.month,
            obj.year,
            allowances=obj.allowances,
        )
        return {
            **payroll["attendance_summary"],
            "unpaid_days": payroll["unpaid_days"],
            "days_in_month": payroll["days_in_month"],
            "per_day_salary": payroll["per_day_salary"],
            "leave_breakdown": payroll["leave_breakdown"],
        }


from .models import EmployeeIncrement


class EmployeeIncrementSerializer(serializers.ModelSerializer):
    employee_details = EmployeeMiniSerializer(source="employee", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    increment_type_display = serializers.CharField(source="get_increment_type_display", read_only=True)
    action_by_name = serializers.CharField(source="action_by.get_full_name", read_only=True)

    class Meta:
        model = EmployeeIncrement
        fields = [
            "id",
            "employee",
            "employee_details",
            "due_date",
            "current_salary",
            "increment_type",
            "increment_type_display",
            "increment_value",
            "calculated_increment_amount",
            "new_salary",
            "status",
            "status_display",
            "rescheduled_date",
            "action_date",
            "action_by",
            "action_by_name",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "calculated_increment_amount",
            "new_salary",
            "action_date",
            "action_by",
            "created_at",
            "updated_at",
        ]


class RescheduleIncrementSerializer(serializers.Serializer):
    rescheduled_date = serializers.DateField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class ProcessIncrementActionSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class EditIncrementHikeSerializer(serializers.Serializer):
    increment_type = serializers.ChoiceField(choices=["PERCENTAGE", "FLAT_AMOUNT"], required=True)
    increment_value = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"), required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    update_employee_policy = serializers.BooleanField(required=False, default=False)


