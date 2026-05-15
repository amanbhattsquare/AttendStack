from rest_framework import serializers

from .models import AttendanceRecord


class AttendanceRecordSerializer(serializers.ModelSerializer):
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
        read_only_fields = fields

    def get_employee_avatar_url(self, obj):
        if not obj.employee.profile_photo:
            return None
        request = self.context.get("request")
        url = obj.employee.profile_photo.url
        return request.build_absolute_uri(url) if request else url


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
