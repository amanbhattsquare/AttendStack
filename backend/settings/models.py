from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator


class SystemSettings(models.Model):
    """Singleton model to store global system settings"""
    # Attendance Settings
    shift_start_time = models.TimeField(default="10:00:00")
    late_cutoff_time = models.TimeField(default="10:15:00")
    shift_end_time = models.TimeField(default="18:00:00")
    half_day_threshold = models.IntegerField(
        default=4,
        validators=[MinValueValidator(1), MaxValueValidator(8)]
    )
    auto_checkout_enabled = models.BooleanField(default=True)
    auto_checkout_time = models.TimeField(default="20:00:00")
    
    # Security Settings
    ip_restriction_enabled = models.BooleanField(default=False)
    allowed_ip_ranges = models.TextField(blank=True, null=True)
    geofencing_enabled = models.BooleanField(default=False)
    office_latitude = models.DecimalField(
        max_digits=9, decimal_places=6, blank=True, null=True
    )
    office_longitude = models.DecimalField(
        max_digits=9, decimal_places=6, blank=True, null=True
    )
    geofence_radius = models.IntegerField(
        default=100,
        validators=[MinValueValidator(50), MaxValueValidator(5000)]
    )
    
    # Company Settings
    company_name = models.CharField(max_length=255, default="Bhatt Square Pvt. Ltd.")
    company_address = models.TextField(default="123 Business Park, Mumbai, Maharashtra 400001")
    company_email = models.EmailField(default="admin@bhattsquare.com")
    company_phone = models.CharField(max_length=20, default="+91 98765 43210")
    company_logo = models.ImageField(upload_to='logos/', null=True, blank=True)
    attendance_rules = models.TextField(blank=True, null=True)
    timezone = models.CharField(max_length=50, default="Asia/Kolkata")
    currency = models.CharField(max_length=10, default="INR")
    date_format = models.CharField(max_length=20, default="DD/MM/YYYY")
    working_days = models.JSONField(default=list)  # Stores ["monday", "tuesday", ...]
    
    # Notification Settings
    email_notifications = models.BooleanField(default=True)
    late_entry_alert = models.BooleanField(default=True)
    leave_request_alert = models.BooleanField(default=True)
    salary_processed_alert = models.BooleanField(default=True)
    new_employee_alert = models.BooleanField(default=False)
    browser_notifications = models.BooleanField(default=True)
    weekly_report_enabled = models.BooleanField(default=True)
    weekly_report_day = models.CharField(max_length=20, default="monday")
    
    # Security Settings
    min_password_length = models.IntegerField(default=8)
    password_expiry_enabled = models.BooleanField(default=False)
    two_factor_required = models.BooleanField(default=False)
    session_timeout_enabled = models.BooleanField(default=True)
    
    # Sunday Unpaid Rule (for weekend penalty)
    sunday_unpaid_rule_enabled = models.BooleanField(default=False, help_text="If enabled, Sunday is marked as unpaid when employee is on leave/absent on the day before or after Sunday")
    
    # Burger Rule (for sandwich leave around holidays)
    burger_rule_enabled = models.BooleanField(default=False, help_text="If enabled, a holiday is marked as unpaid if it is sandwiched between two leave days.")
    
    
    # Paid Leave Allocation Settings
    monthly_paid_leave_days = models.IntegerField(
        default=1,
        validators=[MinValueValidator(0), MaxValueValidator(31)],
        help_text="Number of approved leave days per employee that are paid each month",
    )
    annual_paid_leave_days = models.IntegerField(default=21, help_text="Default number of annual paid leave days per employee")
    sick_leave_days = models.IntegerField(default=12, help_text="Default number of annual sick leave days per employee")
    casual_leave_days = models.IntegerField(default=6, help_text="Default number of annual casual leave days per employee")
    maternity_leave_days = models.IntegerField(default=180, help_text="Default number of maternity leave days per employee")
    paternity_leave_days = models.IntegerField(default=14, help_text="Default number of paternity leave days per employee")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="settings_updated"
    )

    class Meta:
        verbose_name = "System Settings"
        verbose_name_plural = "System Settings"

    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton pattern)
        if SystemSettings.objects.exists() and not self.pk:
            self.pk = SystemSettings.objects.first().pk
        
        # Set default working days if not set
        if not self.working_days:
            self.working_days = ["monday", "tuesday", "wednesday", "thursday", "friday"]
            
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        """Get the singleton instance, create if it doesn't exist"""
        settings, created = cls.objects.get_or_create(pk=1)
        return settings

    def __str__(self):
        return "Global System Settings"


class SettingsChangeLog(models.Model):
    """Track all changes to system settings for audit purposes"""
    settings = models.ForeignKey(SystemSettings, on_delete=models.CASCADE)
    changed_by = models.ForeignKey(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True
    )
    changed_at = models.DateTimeField(auto_now_add=True)
    field_name = models.CharField(max_length=100)
    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        verbose_name = "Settings Change Log"
        verbose_name_plural = "Settings Change Logs"
        ordering = ["-changed_at"]

    def __str__(self):
        return f"{self.field_name} changed by {self.changed_by} on {self.changed_at}"