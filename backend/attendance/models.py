from datetime import timedelta

from django.db import models
from django.utils import timezone

from employees.models import Employee


AUTO_PRESERVED_STATUSES = frozenset([
    "LEAVE",
    "PAID_LEAVE",
    "HOLIDAY",
    "SUNDAY_UNPAID",
])


class AttendanceStatus(models.TextChoices):
    PRESENT = "PRESENT", "Present"
    LATE = "LATE", "Late Entry"
    HALF_DAY = "HALF_DAY", "Half Day"
    ABSENT = "ABSENT", "Absent"
    LEAVE = "LEAVE", "Leave"
    PAID_LEAVE = "PAID_LEAVE", "Paid Leave"
    HOLIDAY = "HOLIDAY", "Holiday"
    SUNDAY_PAID = "SUNDAY_PAID", "Sunday"
    SUNDAY_UNPAID = "SUNDAY_UNPAID", "Sunday Unpaid"


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
        if self.status in [AttendanceStatus.ABSENT, AttendanceStatus.LEAVE, AttendanceStatus.PAID_LEAVE, AttendanceStatus.HOLIDAY, AttendanceStatus.SUNDAY_UNPAID]:
            return self.get_status_display()
        if self.check_in and not self.check_out:
            return "Clocked In"
        if self.check_in and self.check_out:
            return "Clocked Out"
        return self.get_status_display()

    def refresh_status(self):
        """Auto-compute status from check-in/check-out times.
        Only runs for time-based statuses. Admin-override statuses
        (Leave, Paid Leave, Holiday, Sunday Unpaid) are never touched."""
        if not self.check_in:
            self.status = AttendanceStatus.ABSENT
            return

        local_check_in = timezone.localtime(self.check_in)
        late_cutoff = local_check_in.replace(hour=10, minute=15, second=0, microsecond=0)
        self.status = AttendanceStatus.LATE if local_check_in > late_cutoff else AttendanceStatus.PRESENT

        if self.check_out and self.total_duration and self.total_duration < timedelta(hours=4):
            self.status = AttendanceStatus.HALF_DAY

    def save(self, *args, **kwargs):
        auto_refresh_status = kwargs.pop("auto_refresh_status", True)
        if auto_refresh_status and self.status not in AUTO_PRESERVED_STATUSES:
            self.refresh_status()
        super().save(*args, **kwargs)


class LeaveType(models.TextChoices):
    CASUAL = "CASUAL", "Casual Leave"
    SICK   = "SICK",   "Sick Leave"
    ANNUAL = "ANNUAL", "Annual Leave"
    OTHER  = "OTHER",  "Other"


class LeaveStatus(models.TextChoices):
    PENDING  = "PENDING",  "Pending"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class LeaveRequest(models.Model):
    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="leave_requests"
    )
    start_date = models.DateField()
    end_date   = models.DateField()
    leave_type = models.CharField(
        max_length=20, choices=LeaveType.choices, default=LeaveType.CASUAL
    )
    reason     = models.TextField()
    status     = models.CharField(
        max_length=20, choices=LeaveStatus.choices, default=LeaveStatus.PENDING
    )
    admin_notes = models.TextField(blank=True, null=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering            = ["-created_at"]
        verbose_name        = "Leave Request"
        verbose_name_plural = "Leave Requests"

    def __str__(self):
        return f"{self.employee.full_name} - {self.get_leave_type_display()} ({self.status})"