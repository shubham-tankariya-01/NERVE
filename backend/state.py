"""
state.py
Holds shared application state to avoid circular imports between main.py and routers.
Supports multi-tenant WebSocket broadcasting.
"""

from typing import TYPE_CHECKING, Any, Set, Dict
import json
import logging

if TYPE_CHECKING:
    from backend.graph.supply_graph import SupplyChainGraph
    from backend.ml.anomaly import AnomalyDetector
    from backend.agents.orchestrator import AgentOrchestrator
    from backend.agents.route_planner import RoutePlanner
    from backend.feeds.weather import WeatherFeed
    from fastapi import WebSocket

log = logging.getLogger("nerve.state")

# Shared module state (set by main.py on startup)
scg: 'SupplyChainGraph' = None
detector: 'AnomalyDetector' = None
agent_orchestrator: 'AgentOrchestrator' = None
route_planner: 'RoutePlanner' = None
weather_feed: 'WeatherFeed' = None
weather_overrides: dict = {}

# Multi-tenant WebSocket client registry
# Key: company_id, Value: set of WebSocket connections
# "platform_admin" key gets all broadcasts
clients: Dict[str, Set['WebSocket']] = {}

async def broadcast_to_company(message: Any, company_id: str) -> None:
    """
    Send message to all WebSocket clients of a specific company
    AND to all platform admins.
    Never raises — disconnected clients are silently removed.
    """
    if isinstance(message, (dict, list)):
        payload = json.dumps(message, default=str)
    else:
        payload = str(message)

    disconnected = set()
    
    # Targets: this company's clients + platform admins
    company_clients = clients.get(company_id, set())
    admin_clients = clients.get("platform_admin", set())
    targets = company_clients | admin_clients
    
    for ws in targets:
        try:
            await ws.send_text(payload)
        except Exception:
            disconnected.add(ws)
    
    # Cleanup disconnected clients
    for ws in disconnected:
        unregister_client(ws)

async def broadcast_to_all(message: Any) -> None:
    """Send to all connected clients regardless of company."""
    if isinstance(message, (dict, list)):
        payload = json.dumps(message, default=str)
    else:
        payload = str(message)

    all_clients = set()
    for client_set in clients.values():
        all_clients |= client_set
    
    disconnected = set()
    for ws in all_clients:
        try:
            await ws.send_text(payload)
        except Exception:
            disconnected.add(ws)
    
    for ws in disconnected:
        unregister_client(ws)

def register_client(ws: 'WebSocket', company_id: str) -> None:
    """Register a new WebSocket connection under a company."""
    if company_id not in clients:
        clients[company_id] = set()
    clients[company_id].add(ws)

def unregister_client(ws: 'WebSocket') -> None:
    """Remove a WebSocket connection from all company buckets."""
    for cid in list(clients.keys()):
        clients[cid].discard(ws)
        if not clients[cid] and cid in clients:
            try:
                del clients[cid]
            except KeyError:
                pass

def count_clients() -> int:
    """Total connected clients across all companies."""
    return sum(len(s) for s in clients.values())
