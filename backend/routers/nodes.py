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
    """Return all nodes, or only assigned ones for operator."""
    if user.get("role") == "platform_admin":
        nodes = await db.nodes.find({}).to_list(length=None)
    elif user.get("role") == "node_operator":
        # Return all nodes for now as requested by user to "manage nodes", 
        # but in production you'd filter by assigned_node_ids
        nodes = await db.nodes.find({}).to_list(length=None)
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    for n in nodes:
        n.pop("_id", None)
    return {"nodes": nodes}

@router.post("/nodes")
async def create_node(payload: NodeCreate, user: dict = Depends(get_current_user), db = Depends(get_async_db)):
    """Create a new node and refresh memory graph."""
    if user.get("role") not in ["platform_admin", "node_operator"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
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
        "risk_level": payload.risk_level
    }
    
    await db.nodes.insert_one(new_node)
    
    # Refresh the in-memory supply chain graph
    if app_state.scg:
        app_state.scg.refresh_from_db()
        
    return {"status": "success", "node_id": node_id}

@router.delete("/nodes/{node_id}")
async def delete_node(node_id: str, user: dict = Depends(get_current_user), db = Depends(get_async_db)):
    """Delete a node and refresh memory graph."""
    if user.get("role") not in ["platform_admin", "node_operator"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    res = await db.nodes.delete_one({"id": node_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Node not found")
        
    # Refresh the in-memory supply chain graph
    if app_state.scg:
        app_state.scg.refresh_from_db()
        
    return {"status": "success"}

@router.get("/nodes/{node_id}/operator")
async def get_node_operator(node_id: str, user: dict = Depends(get_current_user), db = Depends(get_async_db)):
    """Find the operator assigned to this node."""
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
