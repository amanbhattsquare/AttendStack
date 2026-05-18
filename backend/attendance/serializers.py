from datetime import datetime
from django.utils import timezone
from rest_framework import serializers

from employees.models import Employee
from .models import AttendanceRecord


def parse_time_or_datetime(value, date_val):
    if not value:
        return None
    
    # If already a datetime object, return it
    if isinstance(value, datetime):
        return value
        
    # 1. Try parsing ISO format (e.g. 2026-05-18T09:30:00Z)
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if timezone.is_aware(dt):
            return dt
        return timezone.make_aware(dt)
    except ValueError:
        pass
        
    # 2. Try parsing HH:MM or HH:MM:SS format and combine with date_val
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            t = datetime.strptime(value, fmt).time()
            if isinstance(date_val, str):
                d = datetime.strptime(date_val, "%Y-%m-%d").date()
            else:
                d = date_val
            
            dt = datetime.combine(d, t)
            local_tz = timezone.get_current_timezone()
            return timezone.make_aware(dt, local_tz)
        except ValueError:
            pass
            
    raise serializers.ValidationError("Invalid time format. Expected HH:MM, HH:MM:SS, or full ISO datetime.")


class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        write_only=True,
        required=False,
    )
    employee_id = serializers.CharField(source="employee.employee_id", read_only=True)
    employee_uuid = serializers.UUIDField(source="employee.id", read_only=True)
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_email = serializers.EmailField(source="employee.email", read_only=True)
    employee_department = serializers.CharField(source="employee.department", read_only=True)
    employee_designation = serializers.CharField(source="employee.designation", read_only=True)
    employee_avatar_url = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    live_status = serializers.CharField(read_only=True)
    total_hours = serializers.CharField(read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            "id",
            "employee",
            "employee_uuid",
            "employee_id",
            "employee_name",
            "employee_email",
            "employee_department",
            "employee_designation",
            "employee_avatar_url",
            "date",
            "check_in",
            "check_out",
            "total_hours",
            "status",
            "status_label",
            "live_status",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "employee_uuid",
            "employee_id",
            "employee_name",
            "employee_email",
            "employee_department",
            "employee_designation",
            "employee_avatar_url",
            "total_hours",
            "status_label",
            "live_status",
            "created_at",
            "updated_at",
        ]

    def get_employee_avatar_url(self, obj):
        if not obj.employee.profile_photo:
            return None
        request = self.context.get("request")
        url = obj.employee.profile_photo.url
        return request.build_absolute_uri(url) if request else url

    def to_internal_value(self, data):
        data = data.copy()
        
        # Get date
        date_val = data.get("date")
        if not date_val and self.instance:
            date_val = self.instance.date
        if not date_val:
            date_val = timezone.localdate()
            
        if "check_in" in data:
            try:
                data["check_in"] = parse_time_or_datetime(data["check_in"], date_val)
            except Exception as e:
                raise serializers.ValidationError({"check_in": str(e)})
                
        if "check_out" in data:
            try:
                data["check_out"] = parse_time_or_datetime(data["check_out"], date_val)
            except Exception as e:
                raise serializers.ValidationError({"check_out": str(e)})
                
        return super().to_internal_value(data)

    def validate(self, attrs):
        employee = attrs.get("employee")
        date_val = attrs.get("date")
        
        # If creating a new record
        if not self.instance:
            if not employee:
                raise serializers.ValidationError({"employee": "This field is required for new records."})
            if not date_val:
                date_val = timezone.localdate()
                attrs["date"] = date_val
                
            if AttendanceRecord.objects.filter(employee=employee, date=date_val).exists():
                raise serializers.ValidationError(
                    "An attendance record already exists for this employee on this date."
                )
        return attrs


class TodayAttendanceSerializer(serializers.Serializer):
    employee_uuid = serializers.UUIDField()
    employee_id = serializers.CharField()
    employee_name = serializers.CharField()
    employee_email = serializers.EmailField()
    employee_department = serializers.CharField()
    employee_designation = serializers.CharField()
    employee_avatar_url = serializers.CharField(allow_null=True)
    record_id = serializers.IntegerField(allow_null=True)
    date = serializers.DateField()
    check_in = serializers.DateTimeField(allow_null=True)
    check_out = serializers.DateTimeField(allow_null=True)
    total_hours = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    status_label = serializers.CharField()
    live_status = serializers.CharField()