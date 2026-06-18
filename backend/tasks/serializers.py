from rest_framework import serializers

from employees.models import Employee
from .models import Task, TaskPriority, TaskStatus


class TaskSerializer(serializers.ModelSerializer):
    assignee = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all())
    assignee_uuid = serializers.UUIDField(source="assignee.id", read_only=True)
    assignee_id = serializers.CharField(source="assignee.employee_id", read_only=True)
    assignee_name = serializers.CharField(source="assignee.full_name", read_only=True)
    assignee_email = serializers.EmailField(source="assignee.email", read_only=True)
    assignee_department = serializers.CharField(source="assignee.department", read_only=True)
    assignee_designation = serializers.CharField(source="assignee.designation", read_only=True)
    assignee_avatar_url = serializers.SerializerMethodField()
    assigned_by_name = serializers.SerializerMethodField()
    priority_label = serializers.CharField(source="get_priority_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    attachment_url = serializers.SerializerMethodField()
    attachment_name = serializers.SerializerMethodField()
    employee_attachment_url = serializers.SerializerMethodField()
    employee_attachment_name = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "assignee",
            "assignee_uuid",
            "assignee_id",
            "assignee_name",
            "assignee_email",
            "assignee_department",
            "assignee_designation",
            "assignee_avatar_url",
            "assigned_by_name",
            "priority",
            "priority_label",
            "status",
            "status_label",
            "due_date",
            "department",
            "project_category",
            "attachment",
            "attachment_url",
            "attachment_name",
            "employee_attachment",
            "employee_attachment_url",
            "employee_attachment_name",
            "employee_notes",
            "admin_notes",
            "completed_at",
            "is_overdue",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "assignee_uuid",
            "assignee_id",
            "assignee_name",
            "assignee_email",
            "assignee_department",
            "assignee_designation",
            "assignee_avatar_url",
            "assigned_by_name",
            "priority_label",
            "status_label",
            "attachment_url",
            "attachment_name",
            "employee_attachment_url",
            "employee_attachment_name",
            "completed_at",
            "is_overdue",
            "created_at",
            "updated_at",
        ]

    def get_assignee_avatar_url(self, obj):
        if not obj.assignee.profile_photo:
            return None
        request = self.context.get("request")
        url = obj.assignee.profile_photo.url
        return request.build_absolute_uri(url) if request else url

    def get_assigned_by_name(self, obj):
        if obj.assigned_by is None:
            return None
        return obj.assigned_by.get_full_name() or obj.assigned_by.email

    def get_attachment_url(self, obj):
        return self._absolute_file_url(obj.attachment)

    def get_attachment_name(self, obj):
        return self._file_name(obj.attachment)

    def get_employee_attachment_url(self, obj):
        return self._absolute_file_url(obj.employee_attachment)

    def get_employee_attachment_name(self, obj):
        return self._file_name(obj.employee_attachment)

    def _absolute_file_url(self, file_field):
        if not file_field:
            return None
        request = self.context.get("request")
        url = file_field.url
        return request.build_absolute_uri(url) if request else url

    def _file_name(self, file_field):
        if not file_field:
            return None
        return file_field.name.rsplit("/", 1)[-1]

    def validate_attachment(self, value):
        if value and value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Attachment size cannot exceed 10 MB.")
        return value

    def validate_employee_attachment(self, value):
        if value and value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Employee attachment size cannot exceed 10 MB.")
        return value

    def validate_title(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("Task title must be at least 3 characters.")
        return value

    def validate_department(self, value):
        return value.strip()

    def validate_project_category(self, value):
        return value.strip()


class EmployeeTaskStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            TaskStatus.TODO,
            TaskStatus.IN_PROGRESS,
            TaskStatus.BLOCKED,
            TaskStatus.COMPLETED,
        ]
    )
    employee_notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    employee_attachment = serializers.FileField(required=False, allow_empty_file=False)

    def validate_employee_attachment(self, value):
        if value and value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Employee attachment size cannot exceed 10 MB.")
        return value


class TaskChoiceSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()


def task_status_choices():
    return [{"value": value, "label": label} for value, label in TaskStatus.choices]


def task_priority_choices():
    return [{"value": value, "label": label} for value, label in TaskPriority.choices]
