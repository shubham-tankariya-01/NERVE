import random
import string
import logging
import os
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
try:
    from twilio.rest import Client
except ImportError:
    Client = None

try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
except ImportError:
    SendGridAPIClient = None
    Mail = None

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

OTP_EXPIRY_MINUTES = 5

def generate_otp(length: int = 6) -> str:
    """Generate a random numeric OTP."""
    return "".join(random.choices(string.digits, k=length))

def hash_otp(otp: str) -> str:
    """Hash an OTP for secure storage."""
    return pwd_context.hash(otp)

def verify_otp(plain_otp: str, hashed_otp: str) -> bool:
    """Verify a plain OTP against its hashed version."""
    return pwd_context.verify(plain_otp, hashed_otp)

async def store_otp(db, identifier: str, plain_otp: str, otp_type: str) -> None:
    """Store hashed OTP with expiration in database."""
    hashed_otp = hash_otp(plain_otp)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
    
    # Upsert to prevent multiple valid OTPs for same identifier and type
    await db.otps.update_one(
        {"identifier": identifier, "type": otp_type},
        {"$set": {
            "hashed_otp": hashed_otp,
            "expires_at": expires_at,
            "used": False
        }},
        upsert=True
    )

async def validate_otp(db, identifier: str, plain_otp: str, otp_type: str) -> bool:
    """Validate OTP from database, mark as used if valid, and enforce expiration."""
    otp_record = await db.otps.find_one({"identifier": identifier, "type": otp_type})
    
    if not otp_record or otp_record.get("used"):
        return False
        
    # Check expiration
    # Ensure both are offset-aware for comparison, or use naive UTC
    expires_at = otp_record.get("expires_at")
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    if datetime.now(timezone.utc) > expires_at:
        return False
        
    # Verify hash
    if verify_otp(plain_otp, otp_record.get("hashed_otp")):
        # Mark as used to prevent reuse
        await db.otps.update_one(
            {"_id": otp_record["_id"]},
            {"$set": {"used": True}}
        )
        return True
        
    return False

def send_otp_to_mobile(mobile: str, otp: str):
    """Send OTP to mobile using Twilio."""
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    twilio_number = os.environ.get("TWILIO_PHONE_NUMBER")

    if not all([account_sid, auth_token, twilio_number]) or Client is None:
        logger.info(f"Twilio not configured or installed. Falling back to mock-sms. OTP {otp} for {mobile}")
        print(f"mock-sms: Sending OTP {otp} to mobile {mobile}")
        return

    try:
        client = Client(account_sid, auth_token)
        message = client.messages.create(
            body=f"Your Nerve registration OTP is: {otp}. It expires in {OTP_EXPIRY_MINUTES} minutes.",
            from_=twilio_number,
            to=mobile
        )
        logger.info(f"Sent Twilio SMS to {mobile}, SID: {message.sid}")
    except Exception as e:
        logger.error(f"Failed to send SMS to {mobile}: {e}")
        # Fallback to mock for development if Twilio fails
        print(f"mock-sms (fallback): Sending OTP {otp} to mobile {mobile}")

def send_otp_to_email(email: str, otp: str):
    """Send OTP to email using SendGrid."""
    api_key = os.environ.get("SENDGRID_API_KEY")
    from_email = os.environ.get("SENDGRID_FROM_EMAIL")

    print(f"\n[DEBUG] Attempting to send OTP {otp} to {email}...")
    print(f"[DEBUG] Using Sender: {from_email}")

    if not all([api_key, from_email]) or SendGridAPIClient is None:
        print(f"!!! SendGrid NOT CONFIGURED. Falling back to terminal OTP.")
        print(f">>> YOUR OTP IS: {otp} (for {email})")
        return

    message = Mail(
        from_email=from_email,
        to_emails=email,
        subject='Your Nerve Verification Code',
        plain_text_content=f'Your verification code is: {otp}. It expires in {OTP_EXPIRY_MINUTES} minutes.'
    )

    try:
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        print(f"[DEBUG] SendGrid Response Status: {response.status_code}")
        if response.status_code >= 400:
            print(f"!!! SendGrid Error Response: {response.body}")
    except Exception as e:
        print(f"!!! SendGrid Exception: {str(e)}")
        print(f">>> FALLBACK OTP: {otp} (for {email})")
