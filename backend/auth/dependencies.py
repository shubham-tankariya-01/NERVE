from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from backend.auth.jwt_handler import decode_token

# OAuth2 setup - auto_error=False enables backward compatibility
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    FastAPI dependency to extract the user from the JWT.
    
    Backward compatibility: If no token is provided, returns a default system user
    allowing existing unauthenticated behavior to continue.
    """
    if not token:
        # Backward compatibility: Return a system admin user if no token is sent
        return {
            "user_id": "system",
            "email": "system@nerve.internal",
            "role": "platform_admin",
            "company_id": None
        }
    
    payload = decode_token(token)
    user_id: str = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user information",
        )
    
    return {
        "user_id": user_id,
        "email": payload.get("email"),
        "role": payload.get("role"),
        "company_id": payload.get("company_id")
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
