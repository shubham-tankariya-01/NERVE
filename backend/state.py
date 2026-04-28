"""
state.py
Holds shared application state to avoid circular imports between main.py and routers.
Supports multi-tenant WebSocket broadcasting.
"""

from typing import TYPE_CHECKING, Any, Set, Dict
import json
import logging
from dataclasses import asdict
from datetime import datetime, timezone

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

def alert_to_dict(alert: Any) -> dict[str, Any]:
    """Serialize a DisruptionAlert to a JSON-safe dict, handling nested weather objects."""
    from dataclasses import is_dataclass, asdict
    
    if is_dataclass(alert):
        d = asdict(alert)
        if "severity" in d and hasattr(alert.severity, 'value'):
            d["severity"] = alert.severity.value
        # Ensure weather object is flattened or serialized
        if "weather" in d and is_dataclass(alert.weather):
            d["weather"] = asdict(alert.weather)
        return d
    return str(alert)

def build_payload(
    alerts: list[Any],
    agent_logs: list | None = None,
    risk_scores: dict | None = None,
    cascade_debt: list | None = None,
    network_health: int = 100,
    shipments: list | None = None,
    nodes: list | None = None,
    edges: list | None = None,
) -> str:
    """Build the JSON payload that gets pushed over WebSocket."""
    from backend.ml.risk_horizon import generate_risk_horizon
    
    if agent_logs is None:
        agent_logs = []
    if risk_scores is None:
        risk_scores = {}
    if cascade_debt is None:
        cascade_debt = []
    if shipments is None:
        shipments = scg.shipments if scg else []
    
    # NEW: Filtered network extraction
    if nodes is None:
        nodes = list(scg.graph.nodes(data=True)) if (scg and hasattr(scg, 'graph')) else []
    if edges is None:
        edges = list(scg.graph.edges(data=True)) if (scg and hasattr(scg, 'graph')) else []

    weather_summary = []
    if weather_feed:
        for nw in weather_feed.results.values():
            if nw.fetched:
                weather_summary.append({
                    "node_id": nw.node_id,
                    "node_name": nw.node_name,
                    "temperature_c": nw.temperature_c,
                    "humidity_pct": nw.humidity_pct,
                    "precipitation_mm": nw.precipitation_mm,
                    "wind_speed_kmh": nw.wind_speed_kmh,
                    "wind_gusts_kmh": nw.wind_gusts_kmh,
                    "weather_code": nw.weather_code,
                    "condition": nw.weather_label,
                })

    # Delivery Metrics for Executive Dashboard
    delivery_metrics = {
        "in_transit": len([s for s in shipments if s.get("status") == "in_transit"]),
        "delayed": len([s for s in shipments if s.get("status") == "delayed"]),
        "blocked": len([s for s in shipments if s.get("status") == "blocked"]),
        "delivered": len([s for s in shipments if s.get("status") == "delivered"]),
    }

    payload = {
        "type": "disruption_scan",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "alerts_count": len(alerts),
        "alerts": [alert_to_dict(a) for a in alerts],
        "weather": weather_summary,
        "cascade_debt": cascade_debt,
        "risk_horizon": generate_risk_horizon(alerts),
        "agent_logs": agent_logs,
        "network_health": network_health,
        "delivery_metrics": delivery_metrics,
        "shipments": shipments,
        "network": {
            "nodes": nodes,
            "edges": edges,
            "shipments_count": len(shipments),
        },
    }
    return json.dumps(payload, default=str)

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
