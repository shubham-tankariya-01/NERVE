from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class User(BaseModel):
    username: str
    password_hash: str
    role: str = "VIEWER"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Node(BaseModel):
    id: str
    name: str
    type: str
    lat: float
    lng: float
    capacity: float
    current_load: float
    status: str
    risk_level: str

class Route(BaseModel):
    id: str
    from_node: str
    to_node: str
    transport_mode: str
    distance_km: float
    base_transit_time_hrs: float
    cost_per_unit: float
    risk_factor: float

class Shipment(BaseModel):
    id: str
    origin: str
    destination: str
    current_node: str
    status: str
    priority: str
    cargo_type: str
    weight_kg: float
    planned_route: List[str]
    route_taken: List[str]
    estimated_arrival: Optional[str] = None
    departure_time: Optional[str] = None

class DecisionLog(BaseModel):
    shipment_id: str
    action_type: str # REROUTE, DELAY, CANCEL
    reasoning: str
    performed_by: str # User ID or 'AGENT'
    timestamp: datetime = Field(default_factory=datetime.utcnow)
