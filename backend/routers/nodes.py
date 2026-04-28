from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from backend.database import get_async_db
from backend.auth.dependencies import get_current_user
import backend.state as app_state
from backend.serializers import clean_list
import uuid
import json
from backend.state import build_company_payload, broadcast_to_company
from backend.models import NodeRequest, NodeRequestAction
from datetime import datetime

router = APIRouter(prefix="/api/operator", tags=["Node Management"])

class NodeCreate(BaseModel):
    name: str
    type: str = "warehouse"  # warehouse | port | distribution_center
    lat: float
    lng: float
    capacity: int = 500
    risk_level: str = "low"

@router.get("/nodes")
async def get_operator_nodes(user: dict = Depends(get_current_user), db = Depends(get_async_db)):
    """Return nodes filtered by company ownership and operator assignments."""
    query = {}
    
    # Platform Admins see everything. 
    if user.get("role") == "platform_admin":
        pass
    elif user.get("role") in ["logistics_manager", "company_owner"]:
        company_id = user.get("company_id")
        if not company_id:
            raise HTTPException(status_code=403, detail="User not associated with a company")
        query["company_id"] = company_id
    elif user.get("role") == "node_operator":
        company_id = user.get("company_id")
        assigned_node_ids = user.get("assigned_node_ids", [])
        if not company_id:
            raise HTTPException(status_code=403, detail="User not associated with a company")
        # Restrict to assigned nodes within their company
        query = {
            "company_id": company_id,
            "id": {"$in": assigned_node_ids}
        }
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    nodes = await db.nodes.find(query).to_list(length=None)
    return {"nodes": clean_list(nodes)}

@router.post("/nodes")
async def create_node(payload: NodeCreate, user: dict = Depends(get_current_user), db = Depends(get_async_db)):
    """Create a new node belonging to the user's company (Admin/Manager only)."""
    if user.get("role") not in ["platform_admin", "logistics_manager", "company_owner"]:
        raise HTTPException(status_code=403, detail="Only platform admins, company owners, and logistics managers can perform this action")
        
    company_id = user.get("company_id")
    if not company_id and user.get("role") != "platform_admin":
         raise HTTPException(status_code=403, detail="Company association required")

    node_id = f"node_{uuid.uuid4().hex[:6]}"
    new_node = {
        "id": node_id,
        "name": payload.name,
        "type": payload.type,
        "lat": payload.lat,
        "lng": payload.lng,
        "capacity": payload.capacity,
        "current_load": 0,
        "status": "active",
        "risk_level": payload.risk_level,
        "company_id": company_id
    }
    
    await db.nodes.insert_one(new_node)
    
    # Refresh the in-memory supply chain graph
    if app_state.scg:
        app_state.scg.refresh_from_db()

    # Broadcast realtime update to company and admins
    if company_id:
        msg = build_company_payload(company_id)
        await broadcast_to_company(json.loads(msg), company_id)
    
    admin_msg = build_company_payload("platform_admin")
    await broadcast_to_company(json.loads(admin_msg), "platform_admin")
        
    return {"status": "success", "node_id": node_id}

@router.post("/nodes/request")
async def request_node_action(payload: dict, user: dict = Depends(get_current_user), db = Depends(get_async_db)):
    """Operator requests to create or delete a node."""
    if user.get("role") != "node_operator":
        raise HTTPException(status_code=403, detail="Only node operators can submit requests")
    
    action = payload.get("action")
    if action not in [NodeRequestAction.CREATE, NodeRequestAction.DELETE]:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    company_id = user.get("company_id")
    
    request_id = str(uuid.uuid4())
    new_request = {
        "id": request_id,
        "company_id": company_id,
        "requester_id": user.get("username"),
        "action": action,
        "node_id": payload.get("node_id"),
        "node_data": payload.get("node_data"),
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    await db.node_requests.insert_one(new_request)
    
    # Notify owner (via broadcast)
    msg = {"type": "NODE_REQUEST_SUBMITTED", "company_id": company_id}
    await broadcast_to_company(msg, company_id)
    
    return {"status": "success", "request_id": request_id}

@router.get("/nodes/requests")
async def list_node_requests(user: dict = Depends(get_current_user), db = Depends(get_async_db)):
    """List pending node requests for company owner."""
    if user.get("role") not in ["company_owner", "platform_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"status": "pending"}
    if user.get("role") == "company_owner":
        query["company_id"] = user.get("company_id")
    
    requests = await db.node_requests.find(query).to_list(length=None)
    return {"requests": clean_list(requests)}

@router.post("/nodes/requests/{request_id}/approve")
async def approve_node_request(request_id: str, user: dict = Depends(get_current_user), db = Depends(get_async_db)):
    """Owner approves a node request."""
    if user.get("role") not in ["company_owner", "platform_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    request = await db.node_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if user.get("role") == "company_owner" and request["company_id"] != user.get("company_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Execute the action
    if request["action"] == NodeRequestAction.CREATE:
        node_data = request["node_data"]
        node_id = f"node_{uuid.uuid4().hex[:6]}"
        new_node = {
            "id": node_id,
            "name": node_data["name"],
            "type": node_data.get("type", "warehouse"),
            "lat": node_data["lat"],
            "lng": node_data["lng"],
            "capacity": node_data.get("capacity", 500),
            "current_load": 0,
            "status": "active",
            "risk_level": node_data.get("risk_level", "low"),
            "company_id": request["company_id"]
        }
        await db.nodes.insert_one(new_node)
    elif request["action"] == NodeRequestAction.DELETE:
        await db.nodes.delete_one({"id": request["node_id"], "company_id": request["company_id"]})
    
    # Update request status
    await db.node_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "approved",
            "reviewed_by": user.get("username"),
            "reviewed_at": datetime.utcnow()
        }}
    )
    
    # Refresh graph
    if app_state.scg:
        app_state.scg.refresh_from_db()
        
    # Broadcast update
    company_id = request["company_id"]
    msg = build_company_payload(company_id)
    await broadcast_to_company(json.loads(msg), company_id)
    
    return {"status": "success"}

@router.post("/nodes/requests/{request_id}/reject")
async def reject_node_request(request_id: str, payload: dict, user: dict = Depends(get_current_user), db = Depends(get_async_db)):
    """Owner rejects a node request."""
    if user.get("role") not in ["company_owner", "platform_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    request = await db.node_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if user.get("role") == "company_owner" and request["company_id"] != user.get("company_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.node_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "rejected",
            "reason": payload.get("reason"),
            "reviewed_by": user.get("username"),
            "reviewed_at": datetime.utcnow()
        }}
    )
    
    return {"status": "success"}

@router.delete("/nodes/{node_id}")
async def delete_node(node_id: str, user: dict = Depends(get_current_user), db = Depends(get_async_db)):
    """Delete a node if owned by the user's company (Admin/Manager only)."""
    if user.get("role") not in ["platform_admin", "logistics_manager", "company_owner"]:
        raise HTTPException(status_code=403, detail="Only platform admins, company owners, and logistics managers can delete nodes")

    query = {"id": node_id}
    if user.get("role") != "platform_admin":
        query["company_id"] = user.get("company_id")

    res = await db.nodes.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Node not found or access denied")
        
    # Refresh the in-memory supply chain graph
    if app_state.scg:
        app_state.scg.refresh_from_db()

    # Broadcast realtime update
    company_id = user.get("company_id")
    if company_id:
        msg = build_company_payload(company_id)
        await broadcast_to_company(json.loads(msg), company_id)
        
    admin_msg = build_company_payload("platform_admin")
    await broadcast_to_company(json.loads(admin_msg), "platform_admin")
        
    return {"status": "success"}

@router.get("/nodes/{node_id}/operator")
async def get_node_operator(node_id: str, user: dict = Depends(get_current_user), db = Depends(get_async_db)):
    """Find the operator assigned to this node, verifying company/assigned access."""
    # Verify access to the node
    node_query = {"id": node_id}
    if user.get("role") == "platform_admin":
        pass
    elif user.get("role") in ["logistics_manager", "company_owner"]:
        node_query["company_id"] = user.get("company_id")
    elif user.get("role") == "node_operator":
        if node_id not in user.get("assigned_node_ids", []):
             raise HTTPException(status_code=403, detail="Access to this node is denied")
        node_query["company_id"] = user.get("company_id")
    else:
        raise HTTPException(status_code=403, detail="Access denied")
    
    node_exists = await db.nodes.find_one(node_query)
    if not node_exists:
        raise HTTPException(status_code=404, detail="Node not found")

    operator = await db.users.find_one({
        "role": "node_operator",
        "assigned_node_ids": node_id
    })
    
    if not operator:
        return {"operator": None}
        
    return {
        "operator": {
            "full_name": operator.get("full_name"),
            "email": operator.get("email"),
            "mobile": operator.get("mobile")
        }
    }
