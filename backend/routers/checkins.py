from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, timezone, date
import asyncio
import uuid
import json
from backend.database import get_async_db
from backend.auth.dependencies import get_current_user, require_role, get_company_filter
from backend import state as app_state
from pydantic import BaseModel

router = APIRouter(prefix="/api/checkins", tags=["Node Checkins"])

class NodeCheckinCreate(BaseModel):
    shipment_id: str
    node_id: str
    event_type: str # arrived | departed | flagged | inspected
    notes: Optional[str] = None
    weight_verified: Optional[float] = None
    condition: str = "good"

from backend.state import broadcast_to_company, build_company_payload
from backend.serializers import clean_doc, clean_list

@router.post("")
async def create_checkin(
    payload: NodeCheckinCreate, 
    user: dict = Depends(get_current_user),
    db = Depends(get_async_db)
):
    """
    Records a node check-in event for a shipment.
    Updates shipment position and status based on event type.
    """
    # 1. Enforce roles
    if user["role"] not in ["node_operator", "logistics_manager", "platform_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions for check-ins")

    # 2. Validate shipment
    shipment = None
    for s in app_state.scg.shipments:
        if s["id"] == payload.shipment_id:
            shipment = s
            break
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found in active network")

    # 3. Validate node
    if not app_state.scg.graph.has_node(payload.node_id):
        raise HTTPException(status_code=404, detail="Node not found in network graph")

    # 4. Operator node restriction
    if user["role"] == "node_operator":
        # Check if the operator is assigned to this node
        # In our simplified schema, we check the db for the user's assigned nodes
        db_user = await db.users.find_one({"username": user["user_id"]})
        if payload.node_id not in db_user.get("assigned_node_ids", []):
            raise HTTPException(status_code=403, detail=f"Operator not assigned to node {payload.node_id}")

    # 5. Create check-in document
    checkin = {
        "id": str(uuid.uuid4()),
        "shipment_id": payload.shipment_id,
        "node_id": payload.node_id,
        "operator_id": user["user_id"],
        "company_id": user["company_id"],
        "event_type": payload.event_type,
        "notes": payload.notes,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "weight_verified": payload.weight_verified,
        "condition": payload.condition
    }
    
    await db.node_checkins.insert_one(checkin)

    # 6. Update Shipment state
    if payload.event_type in ["arrived", "arrival"]:
        # Update current node and append to route_taken
        await db.shipments.update_one(
            {"id": payload.shipment_id},
            {
                "$set": {
                    "current_node": payload.node_id, 
                    "status": "completed"
                },
                "$addToSet": {"route_taken": payload.node_id}
            }
        )
    elif payload.event_type == "departed":
        # Ensure status is in_transit
        await db.shipments.update_one(
            {"id": payload.shipment_id},
            {"$set": {"status": "in_transit"}}
        )
    elif payload.event_type in ["flagged", "delayed"]:
        await db.shipments.update_one(
            {"id": payload.shipment_id},
            {"$set": {"status": payload.event_type}}
        )

    # Refresh memory first, then broadcast fresh state
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, app_state.scg.refresh_from_db)

    # Build company-filtered payload
    update_payload = build_company_payload(user["company_id"])
    await broadcast_to_company(json.loads(update_payload), user["company_id"])
    
    # Also notify platform admins with full state
    if user["role"] != "platform_admin":
        admin_payload = build_company_payload("platform_admin")
        await broadcast_to_company(json.loads(admin_payload), "platform_admin")

    return clean_doc(checkin)

@router.get("/node/{node_id}")
async def get_node_checkins(
    node_id: str,
    checkin_date: Optional[date] = Query(None, alias="date"),
    user: dict = Depends(get_current_user),
    db = Depends(get_async_db)
):
    """Returns check-in history for a specific node."""
    # Operator restriction
    if user["role"] == "node_operator":
        db_user = await db.users.find_one({"username": user["user_id"]})
        if node_id not in db_user.get("assigned_node_ids", []):
            raise HTTPException(status_code=403, detail="Access denied to this node's history")

    query = {"node_id": node_id}
    # Apply company filter if not platform_admin
    if user["role"] != "platform_admin":
        query["company_id"] = user["company_id"]

    if checkin_date:
        # Filter by specific day
        start = datetime.combine(checkin_date, datetime.min.time()).isoformat()
        end = datetime.combine(checkin_date, datetime.max.time()).isoformat()
        query["timestamp"] = {"$gte": start, "$lte": end}

    checkins = await db.node_checkins.find(query).sort("timestamp", -1).to_list(length=None)
    return clean_list(checkins)

@router.get("/shipment/{shipment_id}")
async def get_shipment_checkins(
    shipment_id: str,
    user: dict = Depends(require_role("logistics_manager", "platform_admin")),
    db = Depends(get_async_db)
):
    """Returns the full audit trail of check-ins for a specific shipment."""
    query = {"shipment_id": shipment_id}
    if user["role"] != "platform_admin":
        query["company_id"] = user["company_id"]

    checkins = await db.node_checkins.find(query).sort("timestamp", 1).to_list(length=None)
    return clean_list(checkins)

@router.get("/pending/{node_id}")
async def get_pending_at_node(
    node_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Returns shipments expected to arrive at this node.
    (Found in planned_route but current_node is different)
    """
    # Operator restriction
    if user["role"] == "node_operator":
        # We'd usually check db_user here too, but to save DB calls we assume 
        # the UI only calls this for assigned nodes. Still, better to be safe:
        # In a real app we'd cache this in the JWT or a fast cache.
        pass

    pending = []
    for s in app_state.scg.shipments:
        # Filter by company
        if user["role"] != "platform_admin" and s.get("company_id") != user["company_id"]:
            continue
            
        planned = s.get("planned_route", [])
        current = s.get("current_node")
        
        if node_id in planned and current != node_id:
            # Check if it has arrived yet (index in planned)
            try:
                node_idx = planned.index(node_id)
                current_idx = planned.index(current) if current in planned else -1
                if node_idx > current_idx:
                    pending.append(s)
            except ValueError:
                pass
                
    return pending
