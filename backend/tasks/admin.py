from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "assignee",
        "department",
        "project_category",
        "priority",
        "status",
        "due_date",
        "assigned_by",
    )
    list_filter = ("status", "priority", "due_date", "department", "project_category", "assignee__department")
    search_fields = (
        "title",
        "department",
        "project_category",
        "assignee__full_name",
        "assignee__employee_id",
        "assignee__email",
    )
    readonly_fields = ("completed_at", "created_at", "updated_at")
