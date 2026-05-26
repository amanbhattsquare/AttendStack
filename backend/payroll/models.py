from django.db import models
from django.utils import timezone
from employees.models import Employee

class PayrollStatus(models.TextChoices):
    PAID = "PAID", "Paid"
    PENDING = "PENDING", "Pending"

class Payroll(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="payrolls"
    )
    month = models.PositiveSmallIntegerField()
    year = models.PositiveIntegerField()
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    deduction_details = models.JSONField(default=dict, blank=True, null=True)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    status = models.CharField(
        max_length=20,
        choices=PayrollStatus.choices,
        default=PayrollStatus.PENDING
    )
    paid_on = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("employee", "month", "year")
        ordering = ["-year", "-month", "employee__full_name"]

    def __str__(self):
        return f"{self.employee.full_name} - {self.month}/{self.year} ({self.status})"

    def save(self, *args, **kwargs):
        from decimal import Decimal
        # Ensure high-precision Decimal types to eliminate Python float type conflicts
        self.basic_salary = Decimal(str(self.basic_salary or 0))
        self.allowances = Decimal(str(self.allowances or 0))
        self.deductions = Decimal(str(self.deductions or 0))
        
        # Calculate net salary
        self.net_salary = self.basic_salary + self.allowances - self.deductions
        if self.status == PayrollStatus.PAID and not self.paid_on:
            self.paid_on = timezone.now()
        super().save(*args, **kwargs)