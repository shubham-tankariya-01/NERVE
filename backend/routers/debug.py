from fastapi import APIRouter
router = APIRouter(prefix="/api/debug", tags=["Debug"])

@router.get("/ping")
async def ping():
    return {"status": "pong"}
