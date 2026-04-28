from datetime import datetime, timezone
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from backend.auth.dependencies import get_current_user
from backend.auth.jwt_handler import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from backend.auth.otp_service import (
    generate_otp,
    send_otp_to_email,
    store_otp,
    validate_otp,
)
from backend.database import get_async_db

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
log = logging.getLogger("nerve.auth")


class RefreshRequest(BaseModel):
    refresh_token: str


class RegisterRequestStep1(BaseModel):
    username: str
    email: str
    mobile: str
    password: str
    full_name: str
    company_name: str


class RegisterRequestStep2(BaseModel):
    email: str
    otp: str


class LoginRequestStep1(BaseModel):
    email: str
    password: str


class LoginRequestStep2(BaseModel):
    email: str
    otp: str


@router.post("/register/step1")
async def register_step1(payload: RegisterRequestStep1, db=Depends(get_async_db)):
    """
    Step 1: Validate inputs, store user temporarily, and send an email OTP.
    The company and user are not created until OTP is verified in step 2.
    """
    log.info("Company owner registration request for %s", payload.email)

    existing = await db.users.find_one(
        {
            "$or": [
                {"username": payload.username},
                {"email": payload.email},
                {"mobile": payload.mobile},
            ]
        }
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Username, email, or mobile already registered",
        )

    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    new_company_id = f"comp_{uuid.uuid4().hex[:8]}"
    user_data = {
        "username": payload.username,
        "email": payload.email,
        "mobile": payload.mobile,
        "full_name": payload.full_name,
        "hashed_password": hash_password(payload.password),
        "role": "company_owner",
        "company_id": new_company_id,
        "assigned_node_ids": [],
        "is_active": True,
        "is_verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.temp_users.update_one(
        {"email": payload.email},
        {
            "$set": {
                "email": payload.email,
                "user_data": user_data,
                "company_name": payload.company_name,
                "company_id": new_company_id,
            }
        },
        upsert=True,
    )

    otp = generate_otp()
    await store_otp(db, identifier=payload.email, plain_otp=otp, otp_type="register")
    try:
        send_otp_to_email(payload.email, otp, otp_type="register")
    except RuntimeError as exc:
        log.error("Registration OTP delivery failed for %s: %s", payload.email, exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    log.info("Registration OTP sent to %s", payload.email)
    return {"message": "OTP sent to your email. Please verify to complete registration."}


@router.post("/register/step2")
async def register_step2(payload: RegisterRequestStep2, db=Depends(get_async_db)):
    """Step 2: Verify email OTP, then create the company and user."""
    is_valid = await validate_otp(
        db,
        identifier=payload.email,
        plain_otp=payload.otp,
        otp_type="register",
    )
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")

    temp_record = await db.temp_users.find_one({"email": payload.email})
    if not temp_record:
        raise HTTPException(
            status_code=404,
            detail="Registration session expired. Please start again.",
        )

    user_data = temp_record["user_data"]
    user_data["is_verified"] = True
    company_name = temp_record["company_name"]
    company_id = temp_record["company_id"]

    if await db.users.find_one({"email": payload.email}):
        raise HTTPException(status_code=409, detail="User already exists")

    new_company = {
        "id": company_id,
        "name": company_name,
        "plan": "Enterprise",
        "status": "active",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "owner_email": payload.email,
    }
    await db.companies.insert_one(new_company)
    await db.users.insert_one(user_data)
    await db.temp_users.delete_one({"email": payload.email})

    log.info(
        "New company '%s' and owner '%s' created successfully",
        company_name,
        payload.email,
    )
    return {"message": "Account created successfully. You can now log in."}


@router.post("/login/step1")
async def login_step1(payload: LoginRequestStep1, db=Depends(get_async_db)):
    """
    Step 1: Validate credentials and send an email OTP.
    Tokens are only issued after OTP verification.
    """
    user = await db.users.find_one({"email": payload.email})

    if not user or not verify_password(payload.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=401,
            detail="Account deactivated. Contact your administrator.",
        )

    otp = generate_otp()
    await store_otp(db, identifier=payload.email, plain_otp=otp, otp_type="login")
    try:
        send_otp_to_email(payload.email, otp, otp_type="login")
    except RuntimeError as exc:
        log.error("Login OTP delivery failed for %s: %s", payload.email, exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    log.info("Login OTP sent to %s", payload.email)
    return {"message": "OTP sent to your email. Please check your inbox."}


@router.post("/login/step2")
async def login_step2(payload: LoginRequestStep2, db=Depends(get_async_db)):
    """Step 2: Verify email OTP and return JWT tokens."""
    is_valid = await validate_otp(
        db,
        identifier=payload.email,
        plain_otp=payload.otp,
        otp_type="login",
    )
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")

    user = await db.users.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account deactivated")

    token_data = {
        "user_id": user.get("username"),
        "email": user.get("email"),
        "role": user.get("role"),
        "company_id": user.get("company_id"),
    }

    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    log.info("User '%s' logged in successfully", user.get("username"))
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.get("username"),
            "username": user.get("username"),
            "email": user.get("email"),
            "role": user.get("role"),
            "company_id": user.get("company_id"),
            "full_name": user.get("full_name"),
        },
    }


@router.post("/refresh")
async def refresh(payload: RefreshRequest, db=Depends(get_async_db)):
    """Issue a new access token using a valid refresh token."""
    token_data = decode_token(payload.refresh_token)
    user_id = token_data.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = await db.users.find_one({"username": user_id})
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User not found or inactive")

    new_token_data = {
        "user_id": user.get("username"),
        "email": user.get("email"),
        "role": user.get("role"),
        "company_id": user.get("company_id"),
    }

    return {
        "access_token": create_access_token(data=new_token_data),
        "token_type": "bearer",
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user), db=Depends(get_async_db)):
    """Return the currently authenticated user profile."""
    user = await db.users.find_one({"username": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    from backend.serializers import clean_doc

    user.pop("hashed_password", None)
    return clean_doc(user)


@router.post("/logout")
async def logout():
    """Confirm logout for the client."""
    return {"message": "Logged out"}
