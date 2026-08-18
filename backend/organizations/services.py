import hashlib
import hmac
import json
import logging
import secrets
import urllib.error
import urllib.request
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def sync_invite_code_to_simplyjob(organization) -> dict:
    """
    Sends a signed real-time webhook to SimplyJob whenever an organization's
    invite code is generated, regenerated, or updated in AttendStack.
    """
    if not organization:
        return {"ok": False, "error": "No organization provided."}

    source_company_id = str(organization.external_company_id or "").strip()
    if not source_company_id and organization.external_source != "SIMPLYJOB":
        # Organization is not linked to a SimplyJob company
        return {"ok": False, "skipped": True, "reason": "Not linked to SimplyJob"}

    webhook_url = str(getattr(
        settings,
        "SIMPLYJOB_WEBHOOK_URL",
        "http://localhost:8000/api/companies/webhooks/attendstack/sync-invite-code/"
    )).strip()

    secret = str(getattr(
        settings,
        "SIMPLYJOB_ONBOARDING_SECRET",
        "91ec6cfae00e9301ba57a1d2db2ad0aff280dc8efe2fc44affc76c66d64373a0"
    )).strip()

    if not webhook_url or not secret:
        return {"ok": False, "error": "SimplyJob webhook endpoint or secret not configured."}

    payload_data = {
        "source_company_id": source_company_id,
        "attendstack_organization_id": str(organization.id),
        "attendstack_invite_code": str(organization.invite_code),
        "timestamp": int(timezone.now().timestamp()),
        "nonce": secrets.token_hex(8),
    }

    try:
        payload_bytes = json.dumps(payload_data).encode("utf-8")
        signature = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()

        req = urllib.request.Request(
            webhook_url,
            data=payload_bytes,
            headers={
                "Content-Type": "application/json",
                "X-AttendStack-Signature": signature,
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=5) as response:
            res_body = json.loads(response.read().decode("utf-8") or "{}")
            logger.info("Successfully synced invite code to SimplyJob: %s", res_body)
            return {"ok": True, "response": res_body}

    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, Exception) as exc:
        logger.warning("Failed to sync invite code to SimplyJob: %s", exc)
        return {"ok": False, "error": str(exc)}
