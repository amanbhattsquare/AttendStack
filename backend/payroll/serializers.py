from decimal import Decimal
from rest_framework import serializers
from .models import Payroll
from employees.models import Employee

class EmployeeMiniSerializer(serializers.ModelSerializer):
    profile_photo_url = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    employment_type_display = serializers.CharField(source="get_employment_type_display", read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id",
            "employee_id",
            "full_name",
            "email",
            "department",
            "designation",
            "status",
            "status_display",
            "employment_type",
            "employment_type_display",
            "joining_date",
            "bank_name",
            "bank_account_number",
            "ifsc_code",
            "aadhaar_number",
            "pan_number",
            "pf_number",
            "uan_number",
            "esic_number",
            "tax_id",
            "annual_salary",
            "profile_photo_url",
        ]

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
    company_details = serializers.SerializerMethodField()

    class Meta:
        model = Payroll
        fields = [
            "id",
            "employee_id",
            "employee_details",
            "company_details",
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

    def get_company_details(self, obj):
        try:
            settings = SystemSettings.get_settings()
            logo_url = None
            if settings.company_logo:
                request = self.context.get("request")
                logo_url = request.build_absolute_uri(settings.company_logo.url) if request else settings.company_logo.url
            return {
                "company_name": settings.company_name or "AttendStack",
                "company_address": settings.company_address or "",
                "company_email": settings.company_email or "",
                "company_phone": settings.company_phone or "",
                "company_website": settings.company_website or "",
                "registration_number": settings.registration_number or "",
                "tax_id": settings.tax_id or "",
                "company_bank_name": settings.company_bank_name or "",
                "company_bank_account_no": settings.company_bank_account_no or "",
                "company_bank_ifsc": settings.company_bank_ifsc or "",
                "company_bank_branch": settings.company_bank_branch or "",
                "company_upi_id": settings.company_upi_id or "",
                "company_logo": logo_url,
                "currency": settings.currency or "INR",
            }
        except Exception:
            return {}

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


from settings.models import SystemSettings

class EmployeeIncrementSerializer(serializers.ModelSerializer):
    employee_details = EmployeeMiniSerializer(source="employee", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    increment_type_display = serializers.CharField(source="get_increment_type_display", read_only=True)
    action_by_name = serializers.CharField(source="action_by.get_full_name", read_only=True)
    cycle_months = serializers.SerializerMethodField()
    cycle_display = serializers.SerializerMethodField()

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
            "cycle_months",
            "cycle_display",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "calculated_increment_amount",
            "new_salary",
            "action_date",
            "action_by",
            "cycle_months",
            "cycle_display",
            "created_at",
            "updated_at",
        ]

    def get_cycle_months(self, obj):
        if obj.employee.override_increment_policy and obj.employee.custom_increment_months:
            return obj.employee.custom_increment_months
        try:
            settings = SystemSettings.get_settings()
            return settings.default_increment_months or 12
        except Exception:
            return 12

    def get_cycle_display(self, obj):
        months = self.get_cycle_months(obj)
        labels = {
            1: "Monthly (Every 1 Month)",
            3: "Quarterly (Every 3 Months)",
            6: "Half-Yearly (Every 6 Months)",
            9: "Every 9 Months",
            12: "Annually (Every 12 Months / 1 Year)",
            18: "Every 18 Months (1.5 Years)",
            24: "Every 24 Months (2 Years)",
        }
        return labels.get(months, f"Every {months} Months")


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


