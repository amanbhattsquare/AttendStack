import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from employees.models import Employee


class TaskPriority(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    URGENT = "URGENT", "Urgent"


class TaskStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    TODO = "TODO", "To Do"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    ON_HOLD = "ON_HOLD", "On Hold"
    COMPLETED = "COMPLETED", "Completed"
    CLOSED = "CLOSED", "Closed"
    CANCELLED = "CANCELLED", "Cancelled"


class Task(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    assignee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="assigned_tasks",
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
    )
    priority = models.CharField(
        max_length=20,
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.PENDING,
        db_index=True,
    )
    due_date = models.DateField(blank=True, null=True, db_index=True)
    department = models.CharField(max_length=120, blank=True, db_index=True)
    project_category = models.CharField(max_length=120, blank=True, db_index=True)
    attachment = models.FileField(upload_to="tasks/attachments/", blank=True, null=True)
    employee_attachment = models.FileField(
        upload_to="tasks/employee-attachments/",
        blank=True,
        null=True,
    )
    employee_notes = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["status", "due_date", "-created_at"]
        indexes = [
            models.Index(fields=["assignee", "status"]),
            models.Index(fields=["priority", "due_date"]),
            models.Index(fields=["department", "project_category"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.title} - {self.assignee.full_name}"

    @property
    def is_overdue(self):
        return (
            self.due_date is not None
            and self.status not in (TaskStatus.COMPLETED, TaskStatus.CLOSED, TaskStatus.CANCELLED)
            and self.due_date < timezone.localdate()
        )

    def save(self, *args, **kwargs):
        if self.status in (TaskStatus.COMPLETED, TaskStatus.CLOSED) and self.completed_at is None:
            self.completed_at = timezone.now()
        elif self.status not in (TaskStatus.COMPLETED, TaskStatus.CLOSED):
            self.completed_at = None
        super().save(*args, **kwargs)
