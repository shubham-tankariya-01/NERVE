from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from backend.database import get_async_db
from backend.auth.dependencies import get_current_user
import backend.state as app_state
import uuid

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
    """Return nodes filtered by company ownership."""
    query = {}
    
    # Platform Admins see everything. Others are filtered by company_id.
    if user.get("role") != "platform_admin":
        company_id = user.get("company_id")
        if not company_id:
            raise HTTPException(status_code=403, detail="User not associated with a company")
        query["company_id"] = company_id

    # For node operators, we could further filter by assigned_node_ids 
    # but as per user request, they should see their company's nodes.
    nodes = await db.nodes.find(query).to_list(length=None)
        
    for n in nodes:
        n.pop("_id", None)
    return {"nodes": nodes}

@router.post("/nodes")
async def create_node(payload: NodeCreate, user: dict = Depends(get_current_user), db = Depends(get_async_db)):
    """Create a new node belonging to the user's company."""
    if user.get("role") not in ["platform_admin", "node_operator", "logistics_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
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
        
    return {"status": "success", "node_id": node_id}

@router.delete("/nodes/{node_id}")
async def delete_node(node_id: str, user: dict = Depends(get_current_user), db = Depends(get_async_db)):
    """Delete a node if owned by the user's company."""
    query = {"id": node_id}
    if user.get("role") != "platform_admin":
        query["company_id"] = user.get("company_id")

    res = await db.nodes.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Node not found or access denied")
        
    # Refresh the in-memory supply chain graph
    if app_state.scg:
        app_state.scg.refresh_from_db()
        
    return {"status": "success"}

@router.get("/nodes/{node_id}/operator")
async def get_node_operator(node_id: str, user: dict = Depends(get_current_user), db = Depends(get_async_db)):
    """Find the operator assigned to this node, verifying company access."""
    # Verify the node belongs to the user's company first
    node_query = {"id": node_id}
    if user.get("role") != "platform_admin":
        node_query["company_id"] = user.get("company_id")
    
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
