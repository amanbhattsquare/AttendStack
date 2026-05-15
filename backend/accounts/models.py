"""
AttendStack – Custom User Model
Roles: SUPER_ADMIN | HR | EMPLOYEE
"""

import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserRole(models.TextChoices):
    SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
    HR          = "HR",          "HR Manager"
    EMPLOYEE    = "EMPLOYEE",    "Employee"


class UserManager(BaseUserManager):
    """Custom manager that uses email as the unique identifier."""

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Email address is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("role", UserRole.EMPLOYEE)
        return self._create_user(email, password, **extra_fields)

    def create_hr(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields["role"] = UserRole.HR
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields["role"] = UserRole.SUPER_ADMIN
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    AttendStack custom user model.
    Three roles: SUPER_ADMIN, HR, EMPLOYEE
    """

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email      = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name  = models.CharField(max_length=100)
    role       = models.CharField(
        max_length=20, choices=UserRole.choices, default=UserRole.EMPLOYEE
    )
    phone      = models.CharField(max_length=15, blank=True, null=True)
    avatar     = models.ImageField(upload_to="avatars/", blank=True, null=True)

    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)

    date_joined = models.DateTimeField(default=timezone.now)
    last_login  = models.DateTimeField(blank=True, null=True)

    # Employee gets an auto-generated employee_id (set by employees app signal)
    employee_id = models.CharField(max_length=20, unique=True, blank=True, null=True)

    objects = UserManager()

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name        = "User"
        verbose_name_plural = "Users"
        ordering            = ["-date_joined"]

    def __str__(self):
        return f"{self.get_full_name()} <{self.email}> [{self.role}]"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name

    @property
    def is_super_admin(self):
        return self.role == UserRole.SUPER_ADMIN

    @property
    def is_hr(self):
        return self.role == UserRole.HR

    @property
    def is_employee(self):
        return self.role == UserRole.EMPLOYEE
