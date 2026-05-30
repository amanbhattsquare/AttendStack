from datetime import timedelta, datetime

from django.db import models
from django.utils import timezone

from employees.models import Employee
from settings.models import SystemSettings


AUTO_PRESERVED_STATUSES = frozenset([
    "LEAVE",
    "PAID_LEAVE",
    "HOLIDAY",
    "SUNDAY_PAID",
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
    is_paid = models.BooleanField(default=True, help_text="Whether this day is paid in payroll")
    leave_request = models.ForeignKey(
        "attendance.LeaveRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_records",
        help_text="Leave request that created this attendance entry, when applicable",
    )
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

        # Get current system settings for dynamic thresholds
        settings = SystemSettings.get_settings()
        local_check_in = timezone.localtime(self.check_in)
        
        # Parse late cutoff time from settings
        late_cutoff_time = settings.late_cutoff_time
        late_hour, late_minute = map(int, late_cutoff_time.strftime("%H:%M").split(":"))
        late_cutoff = local_check_in.replace(
            hour=late_hour, 
            minute=late_minute, 
            second=0, 
            microsecond=0
        )
        
        # Set status to LATE if check-in is after cutoff, else PRESENT
        self.status = AttendanceStatus.LATE if local_check_in > late_cutoff else AttendanceStatus.PRESENT

        # Check for half day (if total duration is less than threshold)
        if self.check_out and self.total_duration and self.total_duration < timedelta(hours=settings.half_day_threshold):
            self.status = AttendanceStatus.HALF_DAY
          
        # Apply Sunday Unpaid Rule if enabled
        if settings.sunday_unpaid_rule_enabled:
            # Get the date of this attendance record
            attendance_date = local_check_in.date()
            
            # Check if this is a Sunday
            if attendance_date.weekday() == 6:  # 6 = Sunday
                # Check previous day (Saturday) and next day (Monday)
                prev_day = attendance_date - timedelta(days=1)
                next_day = attendance_date + timedelta(days=1)
                
                # Check if there's an absence/leave on Saturday OR Monday
                prev_day_absent = AttendanceRecord.objects.filter(
                    employee=self.employee,
                    check_in__date=prev_day,
                    status__in=[AttendanceStatus.ABSENT, AttendanceStatus.LEAVE]
                ).exists()
                
                next_day_absent = AttendanceRecord.objects.filter(
                    employee=self.employee,
                    check_in__date=next_day,
                    status__in=[AttendanceStatus.ABSENT, AttendanceStatus.LEAVE]
                ).exists()
                
                # If either previous or next day is absent/leave, mark this Sunday as unpaid
                if prev_day_absent or next_day_absent:
                    self.status = AttendanceStatus.SUNDAY_UNPAID
                    self.is_paid = False

    def save(self, *args, **kwargs):
        auto_refresh_status = kwargs.pop("auto_refresh_status", True)
        if auto_refresh_status and self.status not in AUTO_PRESERVED_STATUSES:
            self.refresh_status()
        super().save(*args, **kwargs)


class LeaveType(models.TextChoices):
    CASUAL = "CASUAL", "Casual Leave"
    SICK   = "SICK",   "Sick Leave"
    ANNUAL = "ANNUAL", "Annual Leave"
    STUDY = "STUDY", "Study Leave"
    MATERNITY = "MATERNITY", "Maternity Leave"
    PATERNITY = "PATERNITY", "Paternity Leave"
    BEREAVEMENT = "BEREAVEMENT", "Bereavement Leave"
    MARRIAGE = "MARRIAGE", "Marriage Leave"
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
