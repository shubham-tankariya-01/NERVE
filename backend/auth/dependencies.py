from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from backend.auth.jwt_handler import decode_token
from backend.database import get_async_db

# OAuth2 setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=True)

async def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_async_db)) -> dict:
    """
    FastAPI dependency to extract the user from the JWT and verify against DB.
    Returns 401 if token is missing/invalid or user not found.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(token)
    user_id: str = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user information",
        )
    
    user = await db.users.find_one({"username": user_id})
    if not user:
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return {
        "user_id": user_id,
        "email": user.get("email"),
        "role": user.get("role"),
        "company_id": user.get("company_id"),
        "assigned_node_ids": user.get("assigned_node_ids", [])
    }

def require_role(*roles: str):
    """
    Dependency factory to enforce role-based access control.
    Example: Depends(require_role("platform_admin", "logistics_manager"))
    """
    def role_checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of the following roles: {', '.join(roles)}"
            )
        return user
    return role_checker

def require_company_access(company_id: str, user: dict = Depends(get_current_user)):
    """
    Dependency to ensure the user belongs to the requested company
    or is a platform administrator.
    """
    if user.get("role") == "platform_admin":
        return True
    
    if user.get("company_id") != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: User does not belong to this company"
        )
    return True

def get_company_filter(user: dict = Depends(get_current_user)) -> dict:
    """
    Returns a MongoDB filter based on the user's role and company.
    - Platform Admins see everything ({}).
    - Other roles are restricted to their company's data.
    """
    if user.get("role") == "platform_admin":
        return {}
    
    return {"company_id": user.get("company_id")}
