from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from backend.database import get_async_db
from backend.auth.dependencies import require_role
from backend.auth.jwt_handler import hash_password
from pydantic import BaseModel

router = APIRouter(prefix="/api/companies", tags=["Companies"])

class CompanyCreate(BaseModel):
    name: str
    plan: str = "starter"
    owner_email: str

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    plan: Optional[str] = None
    is_active: Optional[bool] = None

class UserCreate(BaseModel):
    email: str
    username: str
    full_name: str
    role: str
    password: str
    assigned_node_ids: List[str] = []

@router.get("", dependencies=[Depends(require_role("platform_admin"))])
async def get_companies(db = Depends(get_async_db)):
    """Returns all companies. Restricted to platform admins."""
    companies = await db.companies.find({}).to_list(length=None)
    for c in companies:
        c.pop("_id", None)
    return companies

@router.post("", dependencies=[Depends(require_role("platform_admin"))])
async def create_company(payload: CompanyCreate, db = Depends(get_async_db)):
    """Creates a new company. Restricted to platform admins."""
    new_company = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "plan": payload.plan,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "owner_email": payload.owner_email
    }
    await db.companies.insert_one(new_company)
    new_company.pop("_id", None)
    return new_company

@router.put("/{company_id}", dependencies=[Depends(require_role("platform_admin"))])
async def update_company(company_id: str, payload: CompanyUpdate, db = Depends(get_async_db)):
    """Updates company details. Restricted to platform admins."""
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.companies.update_one(
        {"id": company_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Company not found")
        
    company = await db.companies.find_one({"id": company_id})
    company.pop("_id", None)
    return company

@router.get("/{company_id}/users", dependencies=[Depends(require_role("platform_admin"))])
async def get_company_users(company_id: str, db = Depends(get_async_db)):
    """Returns all users belonging to a specific company."""
    users = await db.users.find({"company_id": company_id}).to_list(length=None)
    for u in users:
        u.pop("_id", None)
        u.pop("hashed_password", None)
    return users

@router.post("/{company_id}/users", dependencies=[Depends(require_role("platform_admin"))])
async def create_company_user(company_id: str, payload: UserCreate, db = Depends(get_async_db)):
    """Creates a new user for a specific company."""
    # Check if company exists
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Check if username or email already exists
    existing = await db.users.find_one({"$or": [{"username": payload.username}, {"email": payload.email}]})
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    new_user = {
        "username": payload.username,
        "email": payload.email,
        "full_name": payload.full_name,
        "role": payload.role,
        "company_id": company_id,
        "hashed_password": hash_password(payload.password),
        "assigned_node_ids": payload.assigned_node_ids,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    new_user.pop("_id", None)
    new_user.pop("hashed_password", None)
    return new_user

@router.get("/{company_id}/full-data", dependencies=[Depends(require_role("platform_admin"))])
async def get_company_full_details(company_id: str, db = Depends(get_async_db)):
    """Returns nodes, shipments, and users for a company with detailed logging."""
    import logging
    logger = logging.getLogger("nerve")
    logger.info(f"Fetching full details for company: {company_id}")

    company = await db.companies.find_one({"id": company_id})
    if not company:
        logger.error(f"Company not found in DB: {company_id}")
        raise HTTPException(status_code=404, detail=f"Company '{company_id}' not found in registry")
    
    company.pop("_id", None)
    
    try:
        nodes = await db.nodes.find({"company_id": company_id}).to_list(length=None)
        shipments = await db.shipments.find({"company_id": company_id}).to_list(length=None)
        users = await db.users.find({"company_id": company_id}).to_list(length=None)
        
        logger.info(f"Found {len(nodes)} nodes, {len(shipments)} shipments, {len(users)} users")

        for item in nodes + shipments + users:
            item.pop("_id", None)
            item.pop("hashed_password", None)
            # Ensure all objects are JSON serializable (handle datetimes if needed)
            
        return {
            "company": company,
            "nodes": nodes,
            "shipments": shipments,
            "users": users
        }
    except Exception as e:
        logger.exception(f"Error aggregating company data for {company_id}")
        raise HTTPException(status_code=500, detail=str(e))
