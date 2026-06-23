import uuid

from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

from organizations.models import Organization



class EmployeeStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    PROVISION = "PROVISION", "Provision"
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
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="employees", null=True
    )
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

    class Meta:
        ordering = ["full_name"]
        indexes = [
            models.Index(fields=["department", "status"]),
            models.Index(fields=["joining_date"]),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.employee_id})"

    def save(self, *args, **kwargs):
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
                
        super().save(*args, **kwargs)
