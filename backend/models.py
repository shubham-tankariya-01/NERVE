from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
from enum import Enum
import uuid

class UserRole(str, Enum):
    PLATFORM_ADMIN = "platform_admin"
    LOGISTICS_MANAGER = "logistics_manager"
    NODE_OPERATOR = "node_operator"
    CUSTOMER = "customer"
    COMPANY_OWNER = "company_owner" # Added company_owner role explicitly if missing, though it was in routers

class NodeRequestAction(str, Enum):
    CREATE = "create"
    DELETE = "delete"
    UPDATE = "update"

class Company(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    plan: str = "starter" # starter | professional | enterprise
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    owner_email: str

class User(BaseModel):
    username: str
    full_name: str = ""
    email: str = ""
    mobile: str = "" # Added for OTP flow
    hashed_password: str = "" # Renamed from password_hash
    role: UserRole = UserRole.LOGISTICS_MANAGER
    company_id: Optional[str] = None # Link to Company.id
    assigned_node_ids: List[str] = [] # For node operators only
    is_active: bool = True
    is_verified: bool = False # Added for OTP flow
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
    company_id: Optional[str] = None # Added for multi-tenancy

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
    company_id: Optional[str] = None # Added for multi-tenancy
    customer_id: Optional[str] = None # Link to customer user_id
    last_approved_route: Optional[List[str]] = None # Track last agent-suggested route that was approved
    last_approved_at: Optional[datetime] = None
    reviewed_disruptions: List[str] = [] # Node IDs that have already been reviewed for this shipment

class DecisionLog(BaseModel):
    shipment_id: str
    action_type: str # REROUTE, DELAY, CANCEL
    reasoning: str
    performed_by: str # User ID or 'AGENT'
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class NodeCheckin(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    shipment_id: str
    node_id: str
    operator_id: str # User.username
    company_id: str
    event_type: str # arrived | departed | flagged | inspected
    notes: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    weight_verified: Optional[float] = None
    condition: str = "good" # good | damaged | partial

class RerouteApproval(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    shipment_id: str
    suggested_route: List[str]
    original_route: List[str]
    agent_reasoning: str
    disrupted_node: str
    estimated_delay_hrs: float
    priority: str
    status: str = "pending" # pending | approved | rejected | auto_expired
    reviewed_by: Optional[str] = None # User.username
    review_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(minutes=30))

class NodeRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    requester_id: str # User.username
    action: NodeRequestAction
    node_id: Optional[str] = None # For DELETE or UPDATE
    node_data: Optional[dict] = None # For CREATE or UPDATE (contains NodeCreate fields)
    status: str = "pending" # pending | approved | rejected
    reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_by: Optional[str] = None # User.username
    reviewed_at: Optional[datetime] = None
