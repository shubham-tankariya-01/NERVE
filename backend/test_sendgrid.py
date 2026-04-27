import os
import sys
from dotenv import load_dotenv

# Try to load env from backend/.env
env_path = os.path.join('backend', '.env')
if not os.path.exists(env_path):
    # Try current directory if backend/ not found
    env_path = '.env'

print(f"Loading environment from: {env_path}")
load_dotenv(env_path)

api_key = os.environ.get('SENDGRID_API_KEY')
from_email = os.environ.get('SENDGRID_FROM_EMAIL')
target_email = 'shubhamtankariya01@gmail.com'

print(f"SENDGRID_API_KEY: {api_key[:10]}..." if api_key else "SENDGRID_API_KEY: MISSING")
print(f"SENDGRID_FROM_EMAIL: {from_email}")
print(f"TARGET_EMAIL: {target_email}")

try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
except ImportError:
    print("Error: sendgrid package not found. Run 'pip install sendgrid'")
    sys.exit(1)

if not api_key or not from_email:
    print("Error: Missing credentials in .env file.")
    sys.exit(1)

message = Mail(
    from_email=from_email,
    to_emails=target_email,
    subject='Nerve Auth Flow Test',
    plain_text_content='If you see this, your SendGrid configuration is working correctly!'
)

try:
    print("\nAttempting to send test email...")
    sg = SendGridAPIClient(api_key)
    response = sg.send(message)
    print(f"SUCCESS! Status Code: {response.status_code}")
    print("Check your inbox (and spam folder) for 'Nerve Auth Flow Test'.")
except Exception as e:
    print(f"\nFAILED to send email.")
    print(f"Error Message: {str(e)}")
    print("\nCommon fixes:")
    print("1. Ensure your API Key is correct.")
    print(f"2. Ensure '{from_email}' is a VERIFIED SENDER in your SendGrid dashboard.")
    print("3. Check if your SendGrid account is currently restricted or under review.")
