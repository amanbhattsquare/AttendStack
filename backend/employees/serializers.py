from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import Employee

User = get_user_model()


class EmployeeSerializer(serializers.ModelSerializer):
    profile_photo_url = serializers.SerializerMethodField()
    aadhaar_document_url = serializers.SerializerMethodField()
    account_exists = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    employment_type_label = serializers.CharField(source="get_employment_type_display", read_only=True)
    pay_frequency_label = serializers.CharField(source="get_pay_frequency_display", read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id",
            "employee_id",
            "full_name",
            "email",
            "phone",
            "date_of_birth",
            "aadhaar_number",
            "address",
            "profile_photo",
            "profile_photo_url",
            "aadhaar_document",
            "aadhaar_document_url",
            "account_exists",
            "emergency_contact_name",
            "emergency_contact_relationship",
            "emergency_contact_phone",
            "joining_date",
            "department",
            "designation",
            "employment_type",
            "employment_type_label",
            "reporting_manager",
            "status",
            "status_label",
            "annual_salary",
            "pay_frequency",
            "pay_frequency_label",
            "bank_name",
            "bank_account_number",
            "tax_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_full_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Enter a valid name.")
        return value

    def validate_tax_id(self, value):
        value = value.strip().upper()
        if len(value) < 6:
            raise serializers.ValidationError("Enter a valid PAN or tax ID.")
        return value

    def validate_annual_salary(self, value):
        if value <= 0:
            raise serializers.ValidationError("Annual salary must be greater than zero.")
        return value

    def get_profile_photo_url(self, obj):
        return self._absolute_file_url(obj.profile_photo)

    def get_aadhaar_document_url(self, obj):
        return self._absolute_file_url(obj.aadhaar_document)

    def get_account_exists(self, obj):
        annotated_value = getattr(obj, "account_exists_annotation", None)
        if annotated_value is not None:
            return bool(annotated_value)
        return User.objects.filter(email__iexact=obj.email).exists()

    def _absolute_file_url(self, file_field):
        if not file_field:
            return None
        request = self.context.get("request")
        url = file_field.url
        return request.build_absolute_uri(url) if request else url
