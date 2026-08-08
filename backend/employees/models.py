import uuid

from django.core.validators import RegexValidator
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models, transaction
from django.db.models.functions import Coalesce
from django.utils import timezone

from organizations.models import Organization



class EmployeeStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    PROVISION = "PROVISION", "Provision"
    INACTIVE = "INACTIVE", "Inactive"
    ON_LEAVE = "ON_LEAVE", "On Leave"
    TERMINATED = "TERMINATED", "Terminated"


ATTENDANCE_ELIGIBLE_STATUSES = (
    EmployeeStatus.ACTIVE,
    EmployeeStatus.PROVISION,
    EmployeeStatus.ON_LEAVE,
)

ATTENDANCE_WORKING_STATUSES = (
    EmployeeStatus.ACTIVE,
    EmployeeStatus.PROVISION,
)


class EmployeeQuerySet(models.QuerySet):
    def attendance_eligible_on(self, attendance_date):
        """Employees whose latest status on a date permits attendance."""
        latest_status = EmployeeStatusHistory.objects.filter(
            employee_id=models.OuterRef("pk"),
            effective_date__lte=attendance_date,
        ).order_by("-effective_date", "-created_at", "-pk")

        return self.annotate(
            attendance_status_on_date=Coalesce(
                models.Subquery(latest_status.values("status")[:1]),
                models.F("status"),
                output_field=models.CharField(),
            )
        ).filter(attendance_status_on_date__in=ATTENDANCE_ELIGIBLE_STATUSES)


class EmploymentType(models.TextChoices):
    FULL_TIME = "FULL_TIME", "Full-time"
    PART_TIME = "PART_TIME", "Part-time"
    CONTRACT = "CONTRACT", "Contract"
    INTERN = "INTERN", "Intern"


class PayFrequency(models.TextChoices):
    MONTHLY = "MONTHLY", "Monthly"
    WEEKLY = "WEEKLY", "Weekly"
    BI_WEEKLY = "BI_WEEKLY", "Bi-Weekly"


class Employee(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="employees", null=True
    )
    external_source = models.CharField(max_length=40, blank=True)
    external_application_id = models.CharField(
        max_length=64,
        unique=True,
        blank=True,
        null=True,
        db_index=True,
    )
    external_payload = models.JSONField(default=dict, blank=True)
    employee_id = models.CharField(max_length=30, unique=True, db_index=True, blank=True)

    full_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True, db_index=True)
    phone = models.CharField(
        max_length=15,
        validators=[RegexValidator(r"^\+?[0-9]{10,15}$", "Enter a valid phone number.")],
    )
    date_of_birth = models.DateField(blank=True, null=True)
    aadhaar_number = models.CharField(
        max_length=12,
        unique=True,
        blank=True,
        null=True,
        validators=[RegexValidator(r"^[0-9]{12}$", "Aadhaar number must be 12 digits.")],
    )
    address = models.TextField(blank=True)
    profile_photo = models.ImageField(upload_to="employees/photos/", blank=True, null=True)
    aadhaar_document = models.FileField(upload_to="employees/aadhaar/", blank=True, null=True)
    pan_card_document = models.FileField(upload_to="employees/pan/", blank=True, null=True)
    cv_document = models.FileField(upload_to="employees/cv/", blank=True, null=True)

    emergency_contact_name = models.CharField(max_length=150, blank=True)
    emergency_contact_relationship = models.CharField(max_length=80, blank=True)
    emergency_contact_phone = models.CharField(max_length=15, blank=True)

    joining_date = models.DateField(default=timezone.localdate)
    department = models.CharField(max_length=100, blank=True)
    designation = models.CharField(max_length=120, blank=True)
    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.FULL_TIME,
    )
    reporting_manager = models.CharField(max_length=150, blank=True)
    status = models.CharField(
        max_length=20,
        choices=EmployeeStatus.choices,
        default=EmployeeStatus.ACTIVE,
        db_index=True,
    )

    annual_salary = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    casual_leave_days_override = models.DecimalField(
        max_digits=5, decimal_places=1, blank=True, null=True,
        validators=[MinValueValidator(0), MaxValueValidator(365)],
        help_text="Optional annual Casual/PL entitlement. Blank uses company policy.",
    )
    sick_leave_days_override = models.DecimalField(
        max_digits=5, decimal_places=1, blank=True, null=True,
        validators=[MinValueValidator(0), MaxValueValidator(365)],
        help_text="Optional annual Sick Leave entitlement. Blank uses company policy.",
    )
    pay_frequency = models.CharField(
        max_length=20,
        choices=PayFrequency.choices,
        default=PayFrequency.MONTHLY,
    )
    bank_name = models.CharField(max_length=120, blank=True)
    bank_account_number = models.CharField(max_length=40, blank=True)
    ifsc_code = models.CharField(
        max_length=11,
        blank=True,
        validators=[RegexValidator(r"^$|^[A-Z]{4}0[A-Z0-9]{6}$", "Enter a valid 11-character IFSC code.")],
    )
    tax_id = models.CharField(max_length=20, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = EmployeeQuerySet.as_manager()

    class Meta:
        ordering = ["full_name"]
        indexes = [
            models.Index(fields=["department", "status"]),
            models.Index(fields=["joining_date"]),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.employee_id})"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        update_fields = kwargs.get("update_fields")
        status_is_saved = update_fields is None or "status" in update_fields
        previous_status = None
        if not is_new and status_is_saved:
            previous_status = Employee.objects.filter(pk=self.pk).values_list("status", flat=True).first()

        if not self.employee_id:
            last_emp = Employee.objects.filter(employee_id__startswith="EMP-").order_by("-employee_id").first()
            if last_emp:
                try:
                    last_num = int(last_emp.employee_id.split("-")[1])
                    new_num = last_num + 1
                except (IndexError, ValueError):
                    new_num = 1
            else:
                new_num = 1
            
            while True:
                candidate_id = f"EMP-{new_num:05d}"
                if not Employee.objects.filter(employee_id=candidate_id).exists():
                    self.employee_id = candidate_id
                    break
                new_num += 1
                
        with transaction.atomic():
            super().save(*args, **kwargs)

            if is_new or (status_is_saved and previous_status != self.status):
                default_effective_date = self.joining_date if is_new else timezone.localdate()
                effective_date = getattr(self, "_status_effective_date", default_effective_date)
                effective_date = max(effective_date, self.joining_date)
                EmployeeStatusHistory.objects.create(
                    employee=self,
                    status=self.status,
                    effective_date=effective_date,
                )
            if hasattr(self, "_status_effective_date"):
                del self._status_effective_date

    def status_on(self, effective_date):
        prefetched_history = getattr(self, "_prefetched_objects_cache", {}).get("status_history")
        if prefetched_history is not None:
            matching_history = [
                entry for entry in prefetched_history if entry.effective_date <= effective_date
            ]
            if matching_history:
                return max(
                    matching_history,
                    key=lambda entry: (entry.effective_date, entry.created_at, entry.pk),
                ).status
            return self.status

        status = (
            self.status_history.filter(effective_date__lte=effective_date)
            .order_by("-effective_date", "-created_at", "-pk")
            .values_list("status", flat=True)
            .first()
        )
        return status or self.status

    def is_attendance_eligible_on(self, attendance_date):
        return self.status_on(attendance_date) in ATTENDANCE_ELIGIBLE_STATUSES


class EmployeeStatusHistory(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="status_history",
    )
    status = models.CharField(max_length=20, choices=EmployeeStatus.choices)
    effective_date = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["effective_date", "created_at", "pk"]
        indexes = [
            models.Index(fields=["employee", "effective_date"]),
        ]

    def __str__(self):
        return f"{self.employee.employee_id}: {self.get_status_display()} from {self.effective_date}"
