from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timezone
from backend.database import get_async_db
from backend.auth.jwt_handler import (
    create_access_token, 
    create_refresh_token, 
    decode_token, 
    verify_password,
    hash_password
)
from backend.auth.dependencies import get_current_user
from backend.auth.otp_service import generate_otp, store_otp, validate_otp, send_otp_to_mobile, send_otp_to_email
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class RefreshRequest(BaseModel):
    refresh_token: str

# --- REGISTRATION MODELS ---
class RegisterRequestStep1(BaseModel):
    username: str
    email: str
    mobile: str
    password: str
    full_name: str
    role: str = "logistics_manager"  # platform_admin | logistics_manager | node_operator | customer
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    assigned_node_ids: Optional[List[str]] = []

class RegisterRequestStep2(BaseModel):
    email: str
    otp: str

# --- LOGIN MODELS ---
class LoginRequestStep1(BaseModel):
    email: str
    password: str
    role: str

class LoginRequestStep2(BaseModel):
    email: str
    otp: str

# ==========================================
# 1. REGISTRATION FLOW (Two-Step with Mobile OTP)
# ==========================================

import uuid

@router.post("/register/step1")
async def register_step1(payload: RegisterRequestStep1, db = Depends(get_async_db)):
    """
    Step 1: Validate inputs, hash password, store temporarily, send mobile OTP.
    """
    print(f"\n[AUTH] Received Registration Step 1 request for: {payload.email}")
    valid_roles = ["platform_admin", "logistics_manager", "node_operator", "customer"]
    if payload.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")

    if payload.role in ["logistics_manager", "node_operator", "customer"] and not payload.company_id and not payload.company_name:
        raise HTTPException(status_code=400, detail="Either company_id or company_name is required for this role")

    if payload.role == "node_operator" and not payload.assigned_node_ids:
        raise HTTPException(status_code=400, detail="assigned_node_ids is required for node operators")

    # Check for duplicates in actual users collection
    existing = await db.users.find_one({
        "$or": [
            {"username": payload.username},
            {"email": payload.email},
            {"mobile": payload.mobile}
        ]
    })
    if existing:
        raise HTTPException(status_code=409, detail="Username, email, or mobile already registered")

    final_company_id = payload.company_id
    
    # If a new company name is provided without an ID, create the company on the fly
    if payload.company_name and not payload.company_id:
        new_company_id = f"comp_{uuid.uuid4().hex[:8]}"
        new_company = {
            "id": new_company_id,
            "name": payload.company_name,
            "plan": "Enterprise",
            "status": "active",
            "created_at": datetime.now(timezone.utc)
        }
        await db.companies.insert_one(new_company)
        final_company_id = new_company_id
    elif payload.company_id:
        company = await db.companies.find_one({"id": payload.company_id})
        if not company:
            raise HTTPException(status_code=404, detail=f"Company ID '{payload.company_id}' not found")

    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # DIRECT REGISTRATION (OTP BYPASS FOR DEVELOPMENT)
    user_data = {
        "username": payload.username,
        "email": payload.email,
        "mobile": payload.mobile,
        "full_name": payload.full_name,
        "hashed_password": hash_password(payload.password),
        "role": payload.role,
        "company_id": final_company_id,
        "assigned_node_ids": payload.assigned_node_ids or [],
        "is_active": True,
        "is_verified": True,
        "created_at": datetime.now(timezone.utc)
    }
    await db.users.insert_one(user_data)
    return {"message": "User registered successfully (OTP Bypassed)"}

@router.post("/register/step2")
async def register_step2(payload: RegisterRequestStep2, db = Depends(get_async_db)):
    """
    Step 2: Verify email OTP and create the user in the database.
    """
    is_valid = await validate_otp(db, identifier=payload.email, plain_otp=payload.otp, otp_type="register")
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")

    temp_user = await db.temp_users.find_one({"email": payload.email})
    if not temp_user:
        raise HTTPException(status_code=404, detail="Registration session expired or not found")

    user_data = temp_user["user_data"]
    
    # Final duplicate check just in case
    if await db.users.find_one({"email": payload.email}):
        raise HTTPException(status_code=409, detail="User already exists")

    await db.users.insert_one(user_data)
    await db.temp_users.delete_one({"email": payload.email})

    return {"message": "User registered successfully"}


# ==========================================
# 2. LOGIN FLOW (Email + Password + Email OTP)
# ==========================================

@router.post("/login/step1")
async def login_step1(payload: LoginRequestStep1, db = Depends(get_async_db)):
    """
    Step 1: Validate email, password, and role. Send OTP to email.
    """
    user = await db.users.find_one({"email": payload.email, "role": payload.role})
    
    if not user or not verify_password(payload.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email, password, or role"
        )
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account deactivated")

    # DIRECT LOGIN (OTP BYPASS FOR DEVELOPMENT)
    token_data = {
        "user_id": user.get("username"),
        "email": user.get("email"),
        "role": user.get("role"),
        "company_id": user.get("company_id")
    }
    
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)
    
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
            "full_name": user.get("full_name")
        }
    }

@router.post("/login/step2")
async def login_step2(payload: LoginRequestStep2, db = Depends(get_async_db)):
    """
    Step 2: Verify email OTP and return JWT tokens.
    """
    is_valid = await validate_otp(db, identifier=payload.email, plain_otp=payload.otp, otp_type="login")
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")

    user = await db.users.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token_data = {
        "user_id": user.get("username"),
        "email": user.get("email"),
        "role": user.get("role"),
        "company_id": user.get("company_id")
    }
    
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)
    
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
            "full_name": user.get("full_name")
        }
    }

# ==========================================
# BACKWARD COMPATIBILITY & SESSION ENDPOINTS
# ==========================================

@router.post("/login")
async def login_legacy(form_data: OAuth2PasswordRequestForm = Depends(), db = Depends(get_async_db)):
    """
    DEPRECATED: Legacy single-step login for backward compatibility.
    Accepts either username or email in the 'username' field.
    """
    user = await db.users.find_one({
        "$or": [
            {"username": form_data.username},
            {"email": form_data.username}
        ]
    })
    
    if not user or not verify_password(form_data.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User account is deactivated")

    token_data = {
        "user_id": user.get("username"),
        "email": user.get("email"),
        "role": user.get("role"),
        "company_id": user.get("company_id")
    }
    
    return {
        "access_token": create_access_token(data=token_data),
        "refresh_token": create_refresh_token(data=token_data),
        "token_type": "bearer",
        "user": {
            "id": user.get("username"),
            "email": user.get("email"),
            "role": user.get("role"),
            "company_id": user.get("company_id"),
            "full_name": user.get("full_name")
        }
    }

@router.post("/register")
async def register_legacy(payload: RegisterRequestStep1, db = Depends(get_async_db)):
    """
    DEPRECATED: Legacy single-step registration for backward compatibility.
    """
    # Logic remains similar to the previous one but creates user immediately
    existing = await db.users.find_one({"$or": [{"username": payload.username}, {"email": payload.email}]})
    if existing:
        raise HTTPException(status_code=409, detail="User already exists")

    user_doc = {
        "username": payload.username,
        "email": payload.email,
        "mobile": payload.mobile,
        "full_name": payload.full_name,
        "hashed_password": hash_password(payload.password),
        "role": payload.role,
        "company_id": payload.company_id,
        "assigned_node_ids": payload.assigned_node_ids or [],
        "is_active": True,
        "is_verified": False,
        "created_at": datetime.now(timezone.utc)
    }
    await db.users.insert_one(user_doc)

    token_data = {
        "user_id": payload.username,
        "email": payload.email,
        "role": payload.role,
        "company_id": payload.company_id
    }
    
    return {
        "access_token": create_access_token(data=token_data),
        "refresh_token": create_refresh_token(data=token_data),
        "token_type": "bearer",
        "user": {
            "id": payload.username,
            "username": payload.username,
            "role": payload.role
        }
    }


@router.post("/refresh")
async def refresh(payload: RefreshRequest, db = Depends(get_async_db)):
    """Issues a new access token using a valid refresh token."""
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
        "company_id": user.get("company_id")
    }
    
    return {
        "access_token": create_access_token(data=new_token_data),
        "token_type": "bearer"
    }

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user), db = Depends(get_async_db)):
    """Returns the profile of the currently authenticated user."""
    if current_user["user_id"] == "system":
        raise HTTPException(status_code=401, detail="Authentication required")
        
    user = await db.users.find_one({"username": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.pop("hashed_password", None)
    user.pop("_id", None)
    return user

@router.post("/logout")
async def logout():
    """Confirms the logout intent for the client."""
    return {"message": "Logged out"}
