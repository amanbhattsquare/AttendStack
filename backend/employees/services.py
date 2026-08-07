import secrets
import string

from accounts.models import UserRole
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.db.models import Q
from rest_framework.exceptions import ValidationError

from organizations.models import Organization

from .models import Employee, EmployeeStatus

User = get_user_model()


def sync_employee_user_access(employee: Employee):
    employee_users = User.objects.filter(role=UserRole.EMPLOYEE)
    user = employee_users.filter(employee_id=employee.employee_id).first()
    if user is None:
        user = employee_users.filter(email__iexact=employee.email).first()
    if user is None:
        return None

    if not user.is_active:
        user.is_active = True
        user.save(update_fields=["is_active"])
    return user


def delete_employee_user(employee: Employee):
    lookup = Q(email__iexact=employee.email)
    if employee.employee_id:
        lookup |= Q(employee_id=employee.employee_id)
    return User.objects.filter(lookup, role=UserRole.EMPLOYEE).delete()


def sync_employee_user_email(employee: Employee, previous_email: str):
    employee_users = User.objects.filter(role=UserRole.EMPLOYEE)
    user = employee_users.filter(employee_id=employee.employee_id).first()
    if user is None:
        user = employee_users.filter(email__iexact=previous_email).first()
    if user is None:
        return None

    if User.objects.filter(email__iexact=employee.email).exclude(pk=user.pk).exists():
        raise ValidationError({"email": "A login account with this email already exists."})

    if user.email != employee.email:
        user.email = employee.email
        user.save(update_fields=["email"])
    return user


def generate_temporary_password(length=14):
    alphabet = string.ascii_letters + string.digits + "!@#$%&*?"
    required = [
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%&*?"),
    ]
    remaining = [secrets.choice(alphabet) for _ in range(length - len(required))]
    password_chars = required + remaining
    secrets.SystemRandom().shuffle(password_chars)
    return "".join(password_chars)


def split_full_name(full_name):
    parts = full_name.strip().split()
    first_name = parts[0]
    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
    return first_name, last_name


def resolve_employee_password(password=None):
    if password:
        try:
            validate_password(password)
        except DjangoValidationError as exc:
            raise ValidationError({"password": list(exc.messages)}) from exc
        return password
    return generate_temporary_password()


def create_employee_user(employee: Employee, password=None):
    if User.objects.filter(email__iexact=employee.email).exists():
        raise ValidationError({"detail": "A login account already exists for this employee."})

    if len(employee.employee_id) > 20:
        raise ValidationError({"detail": "Employee ID must be 20 characters or fewer to create a login account."})

    first_name, last_name = split_full_name(employee.full_name)
    employee_password = resolve_employee_password(password)

    try:
        with transaction.atomic():
            user = User.objects.create_user(
                email=employee.email,
                password=employee_password,
                first_name=first_name,
                last_name=last_name,
                phone=employee.phone,
                employee_id=employee.employee_id,
                role=UserRole.EMPLOYEE,
            )
    except IntegrityError as exc:
        raise ValidationError({"detail": "Unable to create login account because employee credentials conflict with an existing user."}) from exc

    return user, employee_password


def reset_employee_user_password(employee: Employee, password=None):
    try:
        user = User.objects.get(email__iexact=employee.email, role=UserRole.EMPLOYEE)
    except User.DoesNotExist as exc:
        raise ValidationError({"detail": "No login account exists for this employee. Create a password first."}) from exc

    employee_password = resolve_employee_password(password)
    user.set_password(employee_password)
    user.is_active = True
    user.save(update_fields=["password", "is_active"])
    return user, employee_password


def sync_employee_from_simplyjob(*, company_data, employee_data):
    source_company_id = str(company_data.get("source_company_id", "")).strip()
    company_name = str(company_data.get("company_name", "")).strip()
    if not source_company_id:
        raise ValidationError({"source_company_id": "Company source ID is required."})
    if not company_name:
        raise ValidationError({"company_name": "Company name is required."})

    source_application_id = str(employee_data.get("source_application_id", "")).strip()
    full_name = str(employee_data.get("full_name", "")).strip()
    email = str(employee_data.get("email", "")).strip().lower()
    phone = str(employee_data.get("phone", "")).strip()
    if not source_application_id:
        raise ValidationError({"source_application_id": "Source application ID is required."})
    if not full_name:
        raise ValidationError({"full_name": "Employee name is required."})
    if not email:
        raise ValidationError({"email": "Employee email is required."})
    if not phone:
        raise ValidationError({"phone": "Employee phone is required."})

    owner = None
    owner_email = str(company_data.get("owner_email", "")).strip().lower()
    if owner_email:
        owner = User.objects.filter(email__iexact=owner_email).first()

    organization_defaults = {
        "name": company_name,
        "external_source": "simplyjob",
    }
    if owner is not None:
        organization_defaults["owner"] = owner

    organization, _ = Organization.objects.update_or_create(
        external_company_id=source_company_id,
        defaults=organization_defaults,
    )

    joining_date = employee_data.get("joining_date") or timezone.localdate()
    if isinstance(joining_date, str):
        from datetime import date

        joining_date = date.fromisoformat(joining_date)
    status = EmployeeStatus.ACTIVE if joining_date <= timezone.localdate() else EmployeeStatus.PROVISION

    external_payload = employee_data.get("source_payload") or {}
    if not isinstance(external_payload, dict):
        external_payload = {}

    employee, _ = Employee.objects.update_or_create(
        external_application_id=source_application_id,
        defaults={
            "organization": organization,
            "external_source": "simplyjob",
            "external_payload": external_payload,
            "full_name": full_name,
            "email": email,
            "phone": phone,
            "date_of_birth": employee_data.get("date_of_birth") or None,
            "address": str(employee_data.get("address", "")).strip(),
            "joining_date": joining_date,
            "department": str(employee_data.get("department", "")).strip(),
            "designation": str(employee_data.get("designation", "")).strip(),
            "status": status,
            "emergency_contact_name": str(employee_data.get("emergency_contact_name", "")).strip(),
            "emergency_contact_relationship": str(employee_data.get("emergency_contact_relationship", "")).strip(),
            "emergency_contact_phone": str(employee_data.get("emergency_contact_phone", "")).strip(),
        },
    )

    employee._status_effective_date = joining_date
    employee.save(update_fields=["updated_at"])

    user = sync_employee_user_access(employee)
    temporary_password = None
    if user is None:
        user, temporary_password = create_employee_user(employee)

    return organization, employee, user, temporary_password
