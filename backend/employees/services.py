import secrets
import string

from accounts.models import UserRole
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework.exceptions import ValidationError

from .models import Employee, EmployeeStatus

User = get_user_model()


LOGIN_ENABLED_STATUSES = {
    EmployeeStatus.ACTIVE,
    EmployeeStatus.ON_LEAVE,
}


def employee_allows_login(employee: Employee):
    return employee.status in LOGIN_ENABLED_STATUSES


def sync_employee_user_access(employee: Employee):
    user = User.objects.filter(email__iexact=employee.email, role=UserRole.EMPLOYEE).first()
    if user is None:
        return None

    should_be_active = employee_allows_login(employee)
    if user.is_active != should_be_active:
        user.is_active = should_be_active
        user.save(update_fields=["is_active"])
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
    if not employee_allows_login(employee):
        raise ValidationError({"detail": "Login access can only be created for active or on-leave employees."})

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
    if not employee_allows_login(employee):
        raise ValidationError({"detail": "Reactivate the employee before resetting login access."})

    try:
        user = User.objects.get(email__iexact=employee.email, role=UserRole.EMPLOYEE)
    except User.DoesNotExist as exc:
        raise ValidationError({"detail": "No login account exists for this employee. Create a password first."}) from exc

    employee_password = resolve_employee_password(password)
    user.set_password(employee_password)
    user.is_active = employee_allows_login(employee)
    user.save(update_fields=["password", "is_active"])
    return user, employee_password
