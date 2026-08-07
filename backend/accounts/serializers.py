"""
accounts – serializers
JWT token pair + user profile serializers
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
import re

User = get_user_model()

MB = 1024 * 1024
PROFILE_PHOTO_MAX_SIZE = 5 * MB
EMPLOYEE_DOCUMENT_MAX_SIZE = 5 * MB
EMPLOYEE_REGISTRATION_MAX_UPLOAD_SIZE = 18 * MB


def _split_full_name(full_name):
    parts = full_name.strip().split(maxsplit=1)
    return parts[0], parts[1] if len(parts) > 1 else ""


# ──────────────────────────────────────────────────────────────────────────────
# JWT – enriched token payload
# ──────────────────────────────────────────────────────────────────────────────
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Inject role, name, and employee_id into the JWT payload."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"]        = user.role
        token["full_name"]   = user.get_full_name()
        token["email"]       = user.email
        token["employee_id"] = user.employee_id
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Append user meta to the response body as well
        data["user"] = {
            "id":          str(self.user.id),
            "email":       self.user.email,
            "full_name":   self.user.get_full_name(),
            "role":        self.user.role,
            "employee_id": self.user.employee_id,
            "avatar":      self.user.avatar.url if self.user.avatar else None,
        }
        return data


# ──────────────────────────────────────────────────────────────────────────────
# User serializers
# ──────────────────────────────────────────────────────────────────────────────
class UserMiniSerializer(serializers.ModelSerializer):
    """Lightweight user representation (for nested use)."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ["id", "email", "full_name", "role", "employee_id", "avatar"]

    def get_full_name(self, obj):
        return obj.get_full_name()


class UserProfileSerializer(serializers.ModelSerializer):
    """Full user profile – safe for GET requests."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            "id", "email", "first_name", "last_name", "full_name",
            "role", "phone", "avatar", "employee_id",
            "is_active", "date_joined", "last_login",
        ]
        read_only_fields = ["id", "email", "role", "employee_id", "date_joined", "last_login"]

    def get_full_name(self, obj):
        return obj.get_full_name()


class UserUpdateSerializer(serializers.ModelSerializer):
    """Allows updating profile fields (not email/role)."""

    class Meta:
        model  = User
        fields = ["first_name", "last_name", "phone", "avatar"]


class ChangePasswordSerializer(serializers.Serializer):
    """Self-service password change."""

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "New passwords do not match."}
            )
        return attrs

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user


# ──────────────────────────────────────────────────────────────────────────────
# Admin – Create HR/Employee user
# ──────────────────────────────────────────────────────────────────────────────
class RequestPasswordResetOTPSerializer(serializers.Serializer):
    """Request a password-reset verification code."""

    email = serializers.EmailField()


class ResetPasswordWithOTPSerializer(serializers.Serializer):
    """Reset a password using the emailed verification code."""

    email = serializers.EmailField()
    otp = serializers.RegexField(
        regex=r"^\d{6}$",
        write_only=True,
        error_messages={"invalid": "Enter the 6-digit verification code."},
    )
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "New passwords do not match."}
            )
        return attrs


class CreateHRSerializer(serializers.ModelSerializer):
    """Super Admin creates a new HR manager account."""

    password = serializers.CharField(
        write_only=True, required=False, help_text="Leave blank to auto-generate."
    )

    class Meta:
        model  = User
        fields = ["email", "first_name", "last_name", "phone", "password"]

    def create(self, validated_data):
        from accounts.utils import generate_temp_password
        password = validated_data.pop("password", None) or generate_temp_password()
        user = User.objects.create_hr(**validated_data)
        user.set_password(password)
        user.save()
        # Attach the raw password so the view can return / email it
        user._raw_password = password
        return user


class SimplyJobEmployeeOnboardingSerializer(serializers.Serializer):
    source_company_id = serializers.CharField(max_length=64)
    company_name = serializers.CharField(max_length=255)
    owner_email = serializers.EmailField(required=False, allow_blank=True)
    source_application_id = serializers.CharField(max_length=64)
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.RegexField(r"^\+?[0-9]{10,15}$")
    joining_date = serializers.DateField()
    department = serializers.CharField(max_length=100, required=False, allow_blank=True)
    designation = serializers.CharField(max_length=120, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    emergency_contact_relationship = serializers.CharField(required=False, allow_blank=True, max_length=80)
    emergency_contact_phone = serializers.RegexField(
        r"^\+?[0-9]{10,15}$",
        required=False,
        allow_blank=True,
    )
    source_payload = serializers.DictField(required=False, default=dict)


class OrganizationRegistrationSerializer(serializers.Serializer):
    """Public first-run setup: creates one company and its HR owner."""

    organization_name = serializers.CharField(max_length=255)
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.RegexField(r"^\+?[0-9]{10,15}$")
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate_organization_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Enter an organization name.")
        return value

    def validate_full_name(self, value):
        value = value.strip()
        if len(value.split()) < 2:
            raise serializers.ValidationError("Enter your first and last name.")
        return value

    def validate_email(self, value):
        from employees.models import Employee

        if User.objects.filter(email__iexact=value).exists() or Employee.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account already exists with this email address.")
        return value.lower()

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        from employees.models import Employee
        from organizations.models import Organization

        validated_data.pop("confirm_password")
        first_name, last_name = _split_full_name(validated_data["full_name"])
        with transaction.atomic():
            owner = User.objects.create_hr(
                email=validated_data["email"],
                password=validated_data["password"],
                first_name=first_name,
                last_name=last_name,
                phone=validated_data["phone"],
            )
            organization = Organization.objects.create(
                name=validated_data["organization_name"],
                owner=owner,
            )
            # The owner also receives an employee record so organization scoping works
            # consistently across the HR and workforce modules.
            Employee.objects.create(
                organization=organization,
                full_name=validated_data["full_name"],
                email=validated_data["email"],
                phone=validated_data["phone"],
                department="Management",
                designation="Organization Owner",
            )
        return organization


class EmployeeSelfRegistrationSerializer(serializers.Serializer):
    """Public employee onboarding. Employment and pay details are intentionally absent."""

    organization_code = serializers.CharField(max_length=12)
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.RegexField(r"^\+?[0-9]{10,15}$")
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    profile_photo = serializers.ImageField(required=False, write_only=True)
    aadhaar_number = serializers.RegexField(
        r"^[0-9]{12}$", required=False, allow_blank=True, allow_null=True
    )
    aadhaar_document = serializers.FileField(required=False, write_only=True)
    pan_card_document = serializers.FileField(required=False, write_only=True)
    cv_document = serializers.FileField(required=False, write_only=True)
    bank_name = serializers.CharField(required=False, allow_blank=True, max_length=120)
    bank_account_number = serializers.CharField(required=False, allow_blank=True, max_length=40)
    ifsc_code = serializers.CharField(required=False, allow_blank=True, max_length=11)
    tax_id = serializers.CharField(required=False, allow_blank=True, max_length=20)
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    emergency_contact_relationship = serializers.CharField(required=False, allow_blank=True, max_length=80)
    emergency_contact_phone = serializers.RegexField(
        r"^\+?[0-9]{10,15}$", required=False, allow_blank=True
    )
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate_organization_code(self, value):
        from organizations.models import Organization

        code = value.strip().upper()
        organization = Organization.objects.filter(invite_code__iexact=code, is_active=True).first()
        if organization is None:
            raise serializers.ValidationError("Enter a valid active organization code.")
        self.organization = organization
        return code

    def validate_full_name(self, value):
        value = value.strip()
        if len(value.split()) < 2:
            raise serializers.ValidationError("Enter your first and last name.")
        return value

    def validate_profile_photo(self, value):
        if value.size > PROFILE_PHOTO_MAX_SIZE:
            raise serializers.ValidationError("Profile photo must be 5 MB or smaller.")
        image_format = getattr(getattr(value, "image", None), "format", "").upper()
        if image_format not in {"JPEG", "PNG", "WEBP"}:
            raise serializers.ValidationError("Upload a JPEG, PNG, or WebP profile photo.")
        return value

    def validate_ifsc_code(self, value):
        value = value.strip().upper()
        if value and not re.fullmatch(r"^[A-Z]{4}0[A-Z0-9]{6}$", value):
            raise serializers.ValidationError("Enter a valid 11-character IFSC code.")
        return value

    def validate_tax_id(self, value):
        value = value.strip().upper()
        if value and len(value) < 6:
            raise serializers.ValidationError("Enter a valid PAN or tax ID.")
        return value

    def _validate_document(self, value, allowed_extensions, label):
        if value.size > EMPLOYEE_DOCUMENT_MAX_SIZE:
            raise serializers.ValidationError(f"{label} must be 5 MB or smaller.")
        if not value.name.lower().endswith(allowed_extensions):
            raise serializers.ValidationError(f"Upload a valid {label} file.")
        return value

    def validate_aadhaar_document(self, value):
        return self._validate_document(value, (".pdf", ".jpg", ".jpeg", ".png", ".webp"), "Aadhaar document")

    def validate_pan_card_document(self, value):
        return self._validate_document(value, (".pdf", ".jpg", ".jpeg", ".png", ".webp"), "PAN card")

    def validate_cv_document(self, value):
        return self._validate_document(value, (".pdf", ".doc", ".docx"), "CV / resume")

    def validate_email(self, value):
        from employees.models import Employee

        if User.objects.filter(email__iexact=value).exists() or Employee.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account or employee record already exists with this email address.")
        return value.lower()

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        upload_fields = ("profile_photo", "aadhaar_document", "pan_card_document", "cv_document")
        total_upload_size = sum(getattr(attrs.get(field), "size", 0) for field in upload_fields)
        if total_upload_size > EMPLOYEE_REGISTRATION_MAX_UPLOAD_SIZE:
            raise serializers.ValidationError(
                {"upload_total": "All uploaded files together must be 18 MB or smaller."}
            )
        return attrs

    def create(self, validated_data):
        from employees.models import Employee

        validated_data.pop("confirm_password")
        validated_data.pop("organization_code")
        first_name, last_name = _split_full_name(validated_data["full_name"])
        aadhaar_number = validated_data.pop("aadhaar_number", None) or None
        with transaction.atomic():
            employee = Employee.objects.create(
                organization=self.organization,
                full_name=validated_data["full_name"],
                email=validated_data["email"],
                phone=validated_data["phone"],
                date_of_birth=validated_data.get("date_of_birth"),
                address=validated_data.get("address", ""),
                profile_photo=validated_data.get("profile_photo"),
                aadhaar_number=aadhaar_number,
                aadhaar_document=validated_data.get("aadhaar_document"),
                pan_card_document=validated_data.get("pan_card_document"),
                cv_document=validated_data.get("cv_document"),
                bank_name=validated_data.get("bank_name", ""),
                bank_account_number=validated_data.get("bank_account_number", ""),
                ifsc_code=validated_data.get("ifsc_code", ""),
                tax_id=validated_data.get("tax_id", ""),
                emergency_contact_name=validated_data.get("emergency_contact_name", ""),
                emergency_contact_relationship=validated_data.get("emergency_contact_relationship", ""),
                emergency_contact_phone=validated_data.get("emergency_contact_phone", ""),
            )
            User.objects.create_user(
                email=employee.email,
                password=validated_data["password"],
                first_name=first_name,
                last_name=last_name,
                phone=employee.phone,
                employee_id=employee.employee_id,
            )
        return employee
