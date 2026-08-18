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
    Synchronizes an organization's new invite code to SimplyJob.
    Performs:
    1. Direct atomic database update to SimplyJob PostgreSQL/Supabase DB.
    2. Signed HTTP Webhook notification to SimplyJob API.
    """
    if not organization:
        return {"ok": False, "error": "No organization provided."}

    source_company_id = str(organization.external_company_id or "").strip()
    if not source_company_id and organization.external_source != "SIMPLYJOB":
        return {"ok": False, "skipped": True, "reason": "Not linked to SimplyJob"}

    results = {"db_updated": False, "webhook_sent": False}
    attendstack_invite_code = str(organization.invite_code).strip()
    attendstack_org_id = str(organization.id).strip()

    # 1. Direct SimplyJob Database Sync (Instant & Fail-safe)
    db_url = getattr(settings, "SIMPLYJOB_DATABASE_URL", "").strip()
    if db_url:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url, connect_timeout=5)
            with conn.cursor() as cur:
                if source_company_id and source_company_id.isdigit():
                    cur.execute(
                        """
                        UPDATE companies_company
                        SET attendstack_invite_code = %s,
                            attendstack_organization_id = %s,
                            updated_at = NOW()
                        WHERE id = %s OR attendstack_organization_id = %s;
                        """,
                        (attendstack_invite_code, attendstack_org_id, int(source_company_id), attendstack_org_id)
                    )
                else:
                    cur.execute(
                        """
                        UPDATE companies_company
                        SET attendstack_invite_code = %s,
                            attendstack_organization_id = %s,
                            updated_at = NOW()
                        WHERE attendstack_organization_id = %s;
                        """,
                        (attendstack_invite_code, attendstack_org_id, attendstack_org_id)
                    )
                conn.commit()
                results["db_updated"] = (cur.rowcount > 0)
                logger.info("Direct SimplyJob DB updated (%d rows) with code %s", cur.rowcount, attendstack_invite_code)
            conn.close()
        except Exception as exc:
            logger.warning("Direct SimplyJob DB sync error: %s", exc)
            results["db_error"] = str(exc)

    # 2. HTTP Webhook Sync (for active socket listeners or remote instances)
    webhook_url = getattr(settings, "SIMPLYJOB_WEBHOOK_URL", "").strip()
    secret = getattr(settings, "SIMPLYJOB_ONBOARDING_SECRET", "").strip()

    if webhook_url and secret:
        payload_data = {
            "source_company_id": source_company_id,
            "attendstack_organization_id": attendstack_org_id,
            "attendstack_invite_code": attendstack_invite_code,
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
            with urllib.request.urlopen(req, timeout=4) as response:
                res_body = json.loads(response.read().decode("utf-8") or "{}")
                results["webhook_sent"] = True
                results["webhook_response"] = res_body
        except Exception as exc:
            results["webhook_error"] = str(exc)

    results["ok"] = bool(results["db_updated"] or results["webhook_sent"])
    results["attendstack_invite_code"] = attendstack_invite_code
    return results
