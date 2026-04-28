from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
from backend.database import get_async_db
from backend.auth.dependencies import get_current_user
from backend.auth.jwt_handler import hash_password
from backend.serializers import clean_list, clean_doc

router = APIRouter(prefix="/api/owner", tags=["Company Owner"])

class UserCreateRequest(BaseModel):
    username: str
    email: str
    mobile: str
    password: str
    full_name: str
    role: str  # logistics_manager | node_operator
    assigned_node_ids: Optional[List[str]] = []

class UserUpdatePasswordRequest(BaseModel):
    password: str

@router.get("/users")
async def list_company_users(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_db)
):
    """List all users belonging to the owner's company."""
    if current_user["role"] not in ["company_owner", "platform_admin"]:
        raise HTTPException(status_code=403, detail="Only company owners or platform admins can access this endpoint")
    
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="User is not associated with any company")
    
    users = await db.users.find({"company_id": company_id}).to_list(length=None)
    # Don't return current user in the list of managed users
    filtered_users = [u for u in users if u["username"] != current_user["user_id"]]
    return {"users": clean_list(filtered_users)}

@router.post("/users")
async def create_company_user(
    payload: UserCreateRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_db)
):
    """Create a new manager or operator for the company."""
    if current_user["role"] not in ["company_owner", "platform_admin"]:
        raise HTTPException(status_code=403, detail="Only company owners or platform admins can create users")
    
    valid_roles = ["logistics_manager", "node_operator"]
    if payload.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")

    # Constraint: Must have at least one node to create an operator
    if payload.role == "node_operator":
        node_count = await db.nodes.count_documents({"company_id": current_user.get("company_id")})
        if node_count == 0:
            raise HTTPException(
                status_code=400, 
                detail="No network nodes exist for your company. Please create at least one node before registering a Node Operator."
            )

    # Check for duplicates
    existing = await db.users.find_one({
        "$or": [
            {"username": payload.username},
            {"email": payload.email},
            {"mobile": payload.mobile}
        ]
    })
    if existing:
        raise HTTPException(status_code=409, detail="User with this username, email, or mobile already exists")

    user_data = {
        "username": payload.username,
        "email": payload.email,
        "mobile": payload.mobile,
        "full_name": payload.full_name,
        "hashed_password": hash_password(payload.password),
        "role": payload.role,
        "company_id": current_user.get("company_id"),
        "assigned_node_ids": payload.assigned_node_ids or [],
        "is_active": True,
        "is_verified": True,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user_data)
    return {"message": f"User {payload.role} created successfully", "username": payload.username}

@router.put("/users/{username}/password")
async def update_user_password(
    username: str,
    payload: UserUpdatePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_db)
):
    """Update a user's password."""
    if current_user["role"] not in ["company_owner", "platform_admin"]:
        raise HTTPException(status_code=403, detail="Only company owners or platform admins can update passwords")
    
    target_user = await db.users.find_one({"username": username, "company_id": current_user.get("company_id")})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found in your company")

    await db.users.update_one(
        {"username": username},
        {"$set": {"hashed_password": hash_password(payload.password)}}
    )
    return {"message": "Password updated successfully"}

@router.delete("/users/{username}")
async def delete_user(
    username: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_db)
):
    """Delete a user from the company."""
    if current_user["role"] not in ["company_owner", "platform_admin"]:
        raise HTTPException(status_code=403, detail="Only company owners or platform admins can delete users")
    
    target_user = await db.users.find_one({"username": username, "company_id": current_user.get("company_id")})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found in your company")

    if target_user["role"] == "company_owner":
        raise HTTPException(status_code=400, detail="Cannot delete a company owner")

    await db.users.delete_one({"username": username})
    return {"message": "User deleted successfully"}
