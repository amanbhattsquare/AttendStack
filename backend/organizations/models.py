import secrets

from django.conf import settings
from django.db import models


def generate_invite_code():
    """Generate a short, human-friendly code employees can use to join."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "ORG-" + "".join(secrets.choice(alphabet) for _ in range(8))

class Organization(models.Model):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="owned_organizations",
        blank=True,
        null=True,
    )
    external_source = models.CharField(max_length=40, blank=True)
    external_company_id = models.CharField(
        max_length=64,
        unique=True,
        blank=True,
        null=True,
        db_index=True,
    )
    api_key = models.CharField(
        max_length=128,
        blank=True,
        null=True,
        db_index=True,
    )
    phone = models.CharField(max_length=40, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    industry = models.CharField(max_length=120, blank=True, null=True)
    plan_name = models.CharField(max_length=100, blank=True, null=True)
    invite_code = models.CharField(
        max_length=12,
        unique=True,
        db_index=True,
        default=generate_invite_code,
        editable=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name
