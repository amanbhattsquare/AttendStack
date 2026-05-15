from datetime import timedelta

from django.db import models
from django.utils import timezone

from employees.models import Employee


class AttendanceStatus(models.TextChoices):
    PRESENT = "PRESENT", "Present"
    LATE = "LATE", "Late Entry"
    HALF_DAY = "HALF_DAY", "Half-day"
    ABSENT = "ABSENT", "Absent"
    ON_LEAVE = "ON_LEAVE", "On Leave"


class AttendanceRecord(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    date = models.DateField(db_index=True)
    check_in = models.DateTimeField(blank=True, null=True)
    check_out = models.DateTimeField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=AttendanceStatus.choices,
        default=AttendanceStatus.PRESENT,
        db_index=True,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "employee__full_name"]
        constraints = [
            models.UniqueConstraint(fields=["employee", "date"], name="unique_employee_attendance_date"),
        ]
        indexes = [
            models.Index(fields=["date", "status"]),
            models.Index(fields=["employee", "date"]),
        ]

    def __str__(self):
        return f"{self.employee.full_name} - {self.date}"

    @property
    def total_duration(self):
        if not self.check_in or not self.check_out:
            return None
        return self.check_out - self.check_in

    @property
    def total_hours(self):
        duration = self.total_duration
        if duration is None:
            return None
        total_minutes = int(duration.total_seconds() // 60)
        hours, minutes = divmod(total_minutes, 60)
        return f"{hours}h {minutes}m"

    @property
    def live_status(self):
        if self.status in [AttendanceStatus.ABSENT, AttendanceStatus.ON_LEAVE]:
            return self.get_status_display()
        if self.check_in and not self.check_out:
            return "Clocked In"
        if self.check_in and self.check_out:
            return "Clocked Out"
        return self.get_status_display()

    def refresh_status(self):
        if not self.check_in:
            self.status = AttendanceStatus.ABSENT
            return

        local_check_in = timezone.localtime(self.check_in)
        late_cutoff = local_check_in.replace(hour=9, minute=30, second=0, microsecond=0)
        self.status = AttendanceStatus.LATE if local_check_in > late_cutoff else AttendanceStatus.PRESENT

        if self.check_out and self.total_duration and self.total_duration < timedelta(hours=4):
            self.status = AttendanceStatus.HALF_DAY
