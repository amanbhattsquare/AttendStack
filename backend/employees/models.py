import uuid

from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone


class EmployeeStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    ON_LEAVE = "ON_LEAVE", "On Leave"
    TERMINATED = "TERMINATED", "Terminated"


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
    employee_id = models.CharField(max_length=30, unique=True, db_index=True)

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
        validators=[RegexValidator(r"^[0-9]{12}$", "Aadhaar number must be 12 digits.")],
    )
    address = models.TextField(blank=True)
    profile_photo = models.ImageField(upload_to="employees/photos/", blank=True, null=True)
    aadhaar_document = models.FileField(upload_to="employees/aadhaar/", blank=True, null=True)

    emergency_contact_name = models.CharField(max_length=150, blank=True)
    emergency_contact_relationship = models.CharField(max_length=80, blank=True)
    emergency_contact_phone = models.CharField(max_length=15, blank=True)

    joining_date = models.DateField(default=timezone.localdate)
    department = models.CharField(max_length=100)
    designation = models.CharField(max_length=120)
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

    annual_salary = models.DecimalField(max_digits=12, decimal_places=2)
    pay_frequency = models.CharField(
        max_length=20,
        choices=PayFrequency.choices,
        default=PayFrequency.MONTHLY,
    )
    bank_name = models.CharField(max_length=120)
    bank_account_number = models.CharField(max_length=40)
    tax_id = models.CharField(max_length=20)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]
        indexes = [
            models.Index(fields=["department", "status"]),
            models.Index(fields=["joining_date"]),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.employee_id})"
