from fastapi import APIRouter, Depends, HTTPException, status
from backend.database import get_async_db
from backend.auth.dependencies import get_current_user
from backend.utils.demo_restore import restore_demo_data
import logging

router = APIRouter(prefix="/api/admin", tags=["admin"])
log = logging.getLogger("nerve.admin")

@router.post("/restore-demo-data")
async def admin_restore_demo_data(
    user: dict = Depends(get_current_user),
    db = Depends(get_async_db)
):
    """
    Restores demo data to initial state.
    Only accessible by platform_admin.
    """
    if user.get("role") != "platform_admin":
        log.warning(f"Unauthorized restore attempt by user {user.get('email')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can restore demo data."
        )

    try:
        success = await restore_demo_data(db)
        if success:
            return {"message": "Demo data restored successfully."}
        else:
            raise HTTPException(status_code=500, detail="Failed to restore demo data.")
    except Exception as e:
        log.error(f"Error during demo data restore: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
