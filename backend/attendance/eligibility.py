from django.db import models
from django.db.models.functions import Coalesce

from employees.models import ATTENDANCE_ELIGIBLE_STATUSES, EmployeeStatusHistory


def attendance_eligible_records(queryset):
    """Keep records whose employee status allowed attendance on that record date."""
    latest_status = EmployeeStatusHistory.objects.filter(
        employee_id=models.OuterRef("employee_id"),
        effective_date__lte=models.OuterRef("date"),
    ).order_by("-effective_date", "-created_at", "-pk")

    return queryset.annotate(
        employee_status_on_date=Coalesce(
            models.Subquery(latest_status.values("status")[:1]),
            models.F("employee__status"),
            output_field=models.CharField(),
        )
    ).filter(employee_status_on_date__in=ATTENDANCE_ELIGIBLE_STATUSES)
