"""
accounts – serializers
JWT token pair + user profile serializers
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


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
