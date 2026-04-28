from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import asyncio
import uuid
from backend.database import get_async_db
from backend.auth.dependencies import get_current_user, require_role, get_company_filter
from backend import state as app_state
from backend.serializers import clean_doc, clean_list
from pydantic import BaseModel

router = APIRouter(prefix="/api/rerouting", tags=["Reroute Approvals"])

class ApprovalAction(BaseModel):
    notes: Optional[str] = None

class RejectionAction(BaseModel):
    reason: str

class SuggestionCreate(BaseModel):
    company_id: str
    shipment_id: str
    suggested_route: List[str]
    original_route: List[str]
    agent_reasoning: str
    disrupted_node: str
    estimated_delay_hrs: float
    priority: str

@router.get("/pending")
async def get_pending_reroutes(
    user: dict = Depends(require_role("logistics_manager", "company_owner", "platform_admin")),
    db = Depends(get_async_db)
):
    """Returns all pending reroute suggestions that have not expired."""
    now = datetime.now(timezone.utc).isoformat()
    query = {
        "status": "pending",
        "expires_at": {"$gt": now}
    }
    
    # Apply company isolation
    if user["role"] != "platform_admin":
        query["company_id"] = user["company_id"]

    # Priority mapping for sorting
    # Since we can't easily sort by custom enum values in MongoDB without aggregation,
    # we'll fetch and sort in memory for the relatively small pending list.
    approvals = await db.reroute_approvals.find(query).to_list(length=None)
    
    priority_map = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    approvals.sort(key=lambda x: (priority_map.get(x.get("priority", "medium").lower(), 2), x.get("created_at")))
    
    return clean_list(approvals)

@router.get("/history")
async def get_reroute_history(
    status: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(require_role("logistics_manager", "company_owner", "platform_admin")),
    db = Depends(get_async_db)
):
    """Returns historical reroute decisions (approved, rejected, expired)."""
    query = {"status": {"$ne": "pending"}}
    if status:
        query["status"] = status
        
    if user["role"] != "platform_admin":
        query["company_id"] = user["company_id"]

    history = await db.reroute_approvals.find(query).sort("created_at", -1).to_list(length=limit)
    return clean_list(history)

@router.get("/{approval_id}")
async def get_approval_detail(
    approval_id: str,
    user: dict = Depends(require_role("logistics_manager", "company_owner", "platform_admin")),
    db = Depends(get_async_db)
):
    """Returns full details for a specific reroute suggestion."""
    query = {"id": approval_id}
    if user["role"] != "platform_admin":
        query["company_id"] = user["company_id"]
        
    approval = await db.reroute_approvals.find_one(query)
    if not approval:
        raise HTTPException(status_code=404, detail="Reroute approval not found")
        
    return clean_doc(approval)

@router.post("/{approval_id}/approve")
async def approve_reroute(
    approval_id: str,
    payload: ApprovalAction,
    user: dict = Depends(require_role("logistics_manager", "company_owner", "platform_admin")),
    db = Depends(get_async_db)
):
    """Approves a suggested reroute and updates the shipment path."""
    approval = await db.reroute_approvals.find_one({"id": approval_id, "status": "pending"})
    if not approval:
        raise HTTPException(status_code=404, detail="Pending approval not found or already processed")
    
    # Verify company access
    if user["role"] != "platform_admin" and approval["company_id"] != user["company_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to approve this reroute")

    # 1. Update Shipment Path
    shipment_id = approval["shipment_id"]
    new_route = approval["suggested_route"]
    
    await db.shipments.update_one(
        {"id": shipment_id},
        {
            "$set": {
                "planned_route": new_route,
                "last_approved_route": new_route,
                "last_approved_at": now
            },
            "$addToSet": {"reviewed_disruptions": approval.get("disrupted_node")}
        }
    )

    # 2. Update Approval Status
    now = datetime.now(timezone.utc).isoformat()
    await db.reroute_approvals.update_one(
        {"id": approval_id},
        {
            "$set": {
                "status": "approved",
                "reviewed_by": user["user_id"],
                "reviewed_at": now,
                "review_reason": payload.notes
            }
        }
    )

    # 3. Log Decision
    log_entry = {
        "shipment_id": shipment_id,
        "action_type": "AGENT_REROUTE_APPROVED",
        "reasoning": f"Approved by {user['user_id']}: {payload.notes or 'No notes provided'}",
        "performed_by": user["user_id"],
        "timestamp": now
    }
    await db.decision_logs.insert_one(log_entry)

    # 4. Sync memory graph (non-blocking)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, app_state.scg.refresh_from_db)
    
    return {"status": "success", "message": "Reroute applied successfully"}

@router.post("/{approval_id}/reject")
async def reject_reroute(
    approval_id: str,
    payload: RejectionAction,
    user: dict = Depends(require_role("logistics_manager", "company_owner", "platform_admin")),
    db = Depends(get_async_db)
):
    """Rejects a suggested reroute. The shipment maintains its current path."""
    approval = await db.reroute_approvals.find_one({"id": approval_id, "status": "pending"})
    if not approval:
        raise HTTPException(status_code=404, detail="Pending approval not found or already processed")

    # Verify company access
    if user["role"] != "platform_admin" and approval["company_id"] != user["company_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to reject this reroute")

    now = datetime.now(timezone.utc).isoformat()
    await db.reroute_approvals.update_one(
        {"id": approval_id},
        {
            "$set": {
                "status": "rejected",
                "reviewed_by": user["user_id"],
                "reviewed_at": now,
                "review_reason": payload.reason
            }
        }
    )

    # Mark disruption as reviewed even on rejection to suppress immediate re-suggesting
    await db.shipments.update_one(
        {"id": approval["shipment_id"]},
        {"$addToSet": {"reviewed_disruptions": approval.get("disrupted_node")}}
    )

    # Log Rejection
    log_entry = {
        "shipment_id": approval["shipment_id"],
        "action_type": "AGENT_REROUTE_REJECTED",
        "reasoning": f"Rejected by {user['user_id']}: {payload.reason}",
        "performed_by": user["user_id"],
        "timestamp": now
    }
    await db.decision_logs.insert_one(log_entry)

    return {"status": "rejected", "message": "Reroute suggestion rejected"}

@router.post("/internal/suggest")
async def suggest_reroute_internal(payload: SuggestionCreate, db = Depends(get_async_db)):
    """
    Internal endpoint for the Agent Orchestrator to suggest a reroute.
    No user auth required as it is called by internal services.
    """
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=30)
    
    new_suggestion = {
        "id": str(uuid.uuid4()),
        "company_id": payload.company_id,
        "shipment_id": payload.shipment_id,
        "suggested_route": payload.suggested_route,
        "original_route": payload.original_route,
        "agent_reasoning": payload.agent_reasoning,
        "disrupted_node": payload.disrupted_node,
        "estimated_delay_hrs": payload.estimated_delay_hrs,
        "priority": payload.priority,
        "status": "pending",
        "created_at": now.isoformat(),
        "expires_at": expires.isoformat()
    }
    
    await db.reroute_approvals.insert_one(new_suggestion)
    return {"approval_id": new_suggestion["id"]}
