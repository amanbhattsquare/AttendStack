from rest_framework import serializers
from .models import SystemSettings, SettingsChangeLog


class SettingsChangeLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.full_name", read_only=True)
    
    class Meta:
        model = SettingsChangeLog
        fields = [
            "id", "field_name", "old_value", "new_value", 
            "changed_at", "changed_by_name", "ip_address"
        ]


class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]
        
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Format time fields to HH:MM for frontend
        time_fields = [
            "shift_start_time", "late_cutoff_time", 
            "shift_end_time", "auto_checkout_time"
        ]
        for field in time_fields:
            if data[field]:
                data[field] = data[field][:5]  # Convert "10:15:00" to "10:15"
        return data


class SystemSettingsUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")
        
    def validate_working_days(self, value):
        valid_days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        for day in value:
            if day not in valid_days:
                raise serializers.ValidationError(f"Invalid day: {day}")
        return value