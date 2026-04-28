"""
otp_service.py
Handles OTP generation, storage, validation, and delivery via SendGrid.
Email OTP is mandatory for all authentication flows.
"""

import logging
import os
import secrets
import string
from datetime import datetime, timedelta, timezone

from passlib.context import CryptContext

try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
except ImportError:
    SendGridAPIClient = None
    Mail = None

logger = logging.getLogger("nerve.otp")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

APP_ENV = os.getenv("APP_ENV", "production").strip().lower()
OTP_EXPIRY_MINUTES = 10


def generate_otp(length: int = 6) -> str:
    """Generate a cryptographically secure numeric OTP."""
    return "".join(secrets.choice(string.digits) for _ in range(length))


def hash_otp(otp: str) -> str:
    """Hash an OTP for secure storage."""
    return pwd_context.hash(otp)


def verify_otp(plain_otp: str, hashed_otp: str) -> bool:
    """Verify a plain OTP against its hashed version."""
    return pwd_context.verify(plain_otp, hashed_otp)


async def store_otp(db, identifier: str, plain_otp: str, otp_type: str) -> None:
    """Store hashed OTP with expiration in database. Upserts to invalidate old OTPs."""
    hashed_otp = hash_otp(plain_otp)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)

    await db.otps.update_one(
        {"identifier": identifier, "type": otp_type},
        {
            "$set": {
                "hashed_otp": hashed_otp,
                "expires_at": expires_at,
                "used": False,
            }
        },
        upsert=True,
    )


async def validate_otp(db, identifier: str, plain_otp: str, otp_type: str) -> bool:
    """
    Validate OTP from database. Marks as used if valid. Enforces expiration.
    Returns False if OTP is missing, used, expired, or incorrect.
    
    SPECIAL: Bypasses check for '999999' for pre-seeded developer/demo accounts.
    """
    # ── MASTER OTP BYPASS (NON-PRODUCTION ONLY) ──
    # Allows developers and mentors to log in easily in staging/dev
    SPECIAL_DOMAINS = ["apexlogistics.com", "oceanicfreight.com", "atlassupply.com", "globaltransit.com", "vertexcarriers.com", "ex.com", "solarisglobal.com", "terranovatransit.com"]
    is_special = any(identifier.endswith(dom) for dom in SPECIAL_DOMAINS)
    
    if APP_ENV != "production" and is_special and plain_otp == "999999":
        logger.info("Master OTP used for special account: %s", identifier)
        return True

    otp_record = await db.otps.find_one({"identifier": identifier, "type": otp_type})

    if not otp_record or otp_record.get("used"):
        return False

    expires_at = otp_record.get("expires_at")
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at is None or datetime.now(timezone.utc) > expires_at:
        return False

    if verify_otp(plain_otp, otp_record.get("hashed_otp", "")):
        await db.otps.update_one(
            {"_id": otp_record["_id"]},
            {"$set": {"used": True}},
        )
        return True

    return False


def _build_otp_email_html(otp: str, otp_type: str) -> str:
    """Build a clean, styled HTML email body for OTP delivery."""
    action = "log in to" if otp_type == "login" else "verify your"
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#060b19;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="520" cellpadding="0" cellspacing="0" border="0"
               style="background:#0a1128;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
          <tr>
            <td align="center" style="padding:32px 40px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="display:inline-flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;background:linear-gradient(135deg,#00b4d8,#ff006e);border-radius:10px;
                            display:inline-block;text-align:center;line-height:40px;
                            font-size:22px;font-weight:900;color:#fff;font-family:'Space Grotesk',sans-serif;">N</div>
                <span style="font-size:28px;font-weight:800;letter-spacing:2px;color:#e2e8f0;
                             font-family:'Space Grotesk',sans-serif;">NERVE</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#94a3b8;
                        text-transform:uppercase;letter-spacing:1px;">Verification Code</p>
              <p style="margin:0 0 28px;font-size:16px;color:#cbd5e1;line-height:1.6;">
                Use the code below to {action} your Nerve account.
                This code expires in <strong style="color:#00E5A0;">{OTP_EXPIRY_MINUTES} minutes</strong>.
              </p>

              <div style="background:rgba(0,229,160,0.06);border:2px solid rgba(0,229,160,0.3);
                          border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                <div style="font-size:48px;font-weight:900;letter-spacing:14px;color:#00E5A0;
                            font-family:'Courier New',monospace;line-height:1.2;">{otp}</div>
              </div>

              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                If you did not request this code, please ignore this email. Your account is safe.<br/>
                Do not share this code with anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;font-size:12px;color:#475569;">
                &copy; 2026 Nerve Supply Chain Platform. Secure &amp; Encrypted.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def send_otp_to_email(email: str, otp: str, otp_type: str = "login") -> None:
    """
    Send OTP to email using SendGrid with a styled HTML template.
    Raises RuntimeError on delivery failure.
    Falls back to server logs only in development mode.
    """
    # ── SPECIAL ACCOUNT BYPASS (NON-PRODUCTION ONLY) ──
    SPECIAL_DOMAINS = ["apexlogistics.com", "oceanicfreight.com", "atlassupply.com", "globaltransit.com", "vertexcarriers.com", "ex.com", "solarisglobal.com", "terranovatransit.com"]
    if APP_ENV != "production" and any(email.endswith(dom) for dom in SPECIAL_DOMAINS):
        logger.info("Skipping real email delivery for special account: %s. Use Master OTP 999999.", email)
        return

    api_key = os.environ.get("SENDGRID_API_KEY")
    from_email = os.environ.get("SENDGRID_FROM_EMAIL")

    if not api_key or not from_email or SendGridAPIClient is None:
        if APP_ENV == "development":
            logger.warning(
                "SendGrid not configured. OTP for %s: %s (development mode only)",
                email,
                otp,
            )
            return
        raise RuntimeError(
            "Email OTP delivery is not configured. Set SENDGRID_API_KEY and "
            "SENDGRID_FROM_EMAIL before using authentication in production."
        )

    subject = "Your Nerve Login Code" if otp_type == "login" else "Verify Your Nerve Account"
    html_body = _build_otp_email_html(otp, otp_type)

    message = Mail(
        from_email=from_email,
        to_emails=email,
        subject=subject,
        html_content=html_body,
    )

    try:
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        if response.status_code >= 400:
            logger.error("SendGrid delivery failed for %s: HTTP %d", email, response.status_code)
            raise RuntimeError(
                f"Email delivery failed (status {response.status_code}). Please try again."
            )
        logger.info("OTP email sent to %s via SendGrid (status %d)", email, response.status_code)
    except RuntimeError:
        raise
    except Exception as exc:
        logger.error("SendGrid exception for %s: %s", email, str(exc))
        raise RuntimeError("Email delivery failed. Please try again later.") from exc
