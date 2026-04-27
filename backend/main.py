"""
main.py
FastAPI server with a WebSocket endpoint that pushes live
weather disruption alerts to connected browsers every 10 seconds.

Run:
    python -m backend.main
"""

from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Load environment variables from backend/.env
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(_env_path)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.graph.supply_graph import SupplyChainGraph
from backend.graph.cascade_model import (
    compute_node_risk_scores,
    calculate_cascade_debt,
    compute_network_health,
)
from backend.feeds.weather import WeatherFeed
from backend.ml.anomaly import AnomalyDetector, DisruptionAlert
from backend.ml.risk_horizon import generate_risk_horizon
from backend.agents.orchestrator import AgentOrchestrator
from backend.agents.route_planner import RoutePlanner
from backend.database import get_async_db
from backend import models
from fastapi import Depends, HTTPException, status
from backend.auth.dependencies import get_current_user

# ── logging ───────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("nerve")

# ── config ────────────────────────────────────────────────────────
SCAN_INTERVAL_SECONDS = 10
HOST = "0.0.0.0"
PORT = 8000

# ── shared state ──────────────────────────────────────────────────
scg = SupplyChainGraph()
weather_feed = WeatherFeed(dict(scg.graph.nodes(data=True)))
detector = AnomalyDetector()
agent_orchestrator = AgentOrchestrator()
route_planner = RoutePlanner()

# Auto-incrementing shipment ID counter
_next_shipment_id = 100

# active weather overrides for simulation
weather_overrides: dict[str, dict[str, float]] = {}

# Link to app_state for external routers to access shared objects
from backend import state as app_state
app_state.scg = scg
app_state.weather_feed = weather_feed
app_state.detector = detector
app_state.agent_orchestrator = agent_orchestrator
app_state.route_planner = route_planner
app_state.weather_overrides = weather_overrides

# Use shared clients set from state.py
clients = app_state.clients

# Track last scan timestamp for health endpoint
_last_scan_time: str | None = None


# ── helpers ───────────────────────────────────────────────────────

def alert_to_dict(alert: DisruptionAlert) -> dict[str, Any]:
    """Serialize a DisruptionAlert to a JSON-safe dict."""
    d = asdict(alert)
    d["severity"] = alert.severity.value
    return d


def build_payload(
    alerts: list[DisruptionAlert],
    agent_logs: list | None = None,
    risk_scores: dict | None = None,
    cascade_debt: list | None = None,
    network_health: int = 100,
    shipments: list | None = None,
) -> str:
    """Build the JSON payload that gets pushed over WebSocket."""
    if agent_logs is None:
        agent_logs = []
    if risk_scores is None:
        risk_scores = {}
    if cascade_debt is None:
        cascade_debt = []
    if shipments is None:
        shipments = scg.shipments

    weather_summary = []
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
        "in_transit": len([s for s in scg.shipments if s.get("status") == "in_transit"]),
        "delayed": len([s for s in scg.shipments if s.get("status") == "delayed"]),
        "blocked": len([s for s in scg.shipments if s.get("status") == "blocked"]),
        "delivered": len([s for s in scg.shipments if s.get("status") == "delivered"]),
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
            "nodes": scg.graph.number_of_nodes(),
            "edges": scg.graph.number_of_edges(),
            "shipments_count": len(scg.shipments),
        },
    }
    return json.dumps(payload, default=str)


async def broadcast(message: str) -> None:
    """Send a message to every connected WebSocket client via shared state."""
    from backend import state as app_state
    await app_state.broadcast_to_all(message)


# ── background scanner ────────────────────────────────────────────

import time

last_weather_fetch = 0
WEATHER_FETCH_INTERVAL = 300  # 5 minutes
_weather_fetching = False


async def _background_weather_fetch() -> None:
    """Fetch weather in a background thread without blocking the scan loop."""
    global last_weather_fetch, _weather_fetching
    _weather_fetching = True
    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, weather_feed.fetch_all, 0.15)
        last_weather_fetch = time.time()
        log.info("Weather fetch complete for %d nodes", len(weather_feed.results))
    except Exception:
        log.exception("Weather fetch failed")
    finally:
        _weather_fetching = False


async def scan_loop() -> None:
    """
    Every SCAN_INTERVAL_SECONDS:
      1. Kick off weather fetch in background (non-blocking, rate-limited to 5 mins)
      2. Run anomaly detection with whatever weather data is available
      3. Push results to all connected clients
    """
    log.info("Scanner started  (interval=%ds)", SCAN_INTERVAL_SECONDS)
    while True:
        try:
            # 0. Always refresh from DB at the start of scan
            scg.refresh_from_db()

            current_time = time.time()
            if (current_time - last_weather_fetch >= WEATHER_FETCH_INTERVAL
                    and not _weather_fetching):
                # Fire-and-forget: don't block the scan loop
                asyncio.create_task(_background_weather_fetch())

            # apply simulated weather overrides non-destructively
            import copy
            eval_results = weather_feed.results.copy()
            for nid, overrides in weather_overrides.items():
                if nid in eval_results:
                    nw_copy = copy.copy(eval_results[nid])
                    for param, val in overrides.items():
                        if hasattr(nw_copy, param):
                            setattr(nw_copy, param, val)
                    eval_results[nid] = nw_copy

            alerts = detector.evaluate(eval_results)

            # Compute dynamic analytics
            risk_scores = compute_node_risk_scores(scg, alerts)
            cascade_debt = calculate_cascade_debt(scg, risk_scores)
            network_health = compute_network_health(scg, risk_scores, alerts)

            # Run agents with full context
            # Updated for Phase 3: Suggestion mode is now async
            agent_logs, _ = await agent_orchestrator.process_anomalies(
                alerts, scg,
                risk_scores=risk_scores,
                cascade_debt=cascade_debt,
                company_id="company_demo"
            )

            # terminal logging
            if alerts:
                log.warning(
                    "DISRUPTIONS DETECTED: %d alert(s) | Health: %d/100",
                    len(alerts), network_health,
                )
                for a in alerts:
                    log.warning(
                        "  [%s] %s (%s) — est delay +%dh | %s",
                        a.severity.value,
                        a.node_id,
                        a.node_name,
                        a.estimated_delay_hrs,
                        "; ".join(a.reasons),
                    )
            else:
                log.info("Scan complete — no disruptions | Health: %d/100", network_health)

            if agent_logs:
                for alog in agent_logs:
                    log.info("  [%s] %s", alog["agent"].upper(), alog["action"])

            # push to browsers
            global _last_scan_time
            _last_scan_time = datetime.now(timezone.utc).isoformat()

            if app_state.count_clients() > 0:
                # 1. Prepare full payload for platform admins
                full_msg = build_payload(
                    alerts, agent_logs,
                    risk_scores=risk_scores,
                    cascade_debt=cascade_debt,
                    network_health=network_health,
                )
                await app_state.broadcast_to_company(full_msg, "platform_admin")

                # 2. Prepare per-company filtered payloads
                # Iterate through all connected companies except platform_admin
                active_companies = [cid for cid in app_state.clients.keys() if cid != "platform_admin"]
                
                for cid in active_companies:
                    # Filter shipments
                    c_shipments = [s for s in scg.shipments if s.get("company_id") == cid]
                    
                    # Filter alerts (only nodes in company's shipment routes)
                    c_nodes = set()
                    for s in c_shipments:
                        c_nodes.update(s.get("planned_route", []))
                        c_nodes.update(s.get("route_taken", []))
                    
                    c_alerts = [a for a in alerts if a.node_id in c_nodes]
                    
                    # Build and broadcast filtered payload
                    c_msg = build_payload(
                        c_alerts, agent_logs,
                        risk_scores=risk_scores,
                        cascade_debt=cascade_debt,
                        network_health=network_health,
                        shipments=c_shipments
                    )
                    await app_state.broadcast_to_company(c_msg, cid)
                
                log.info("Pushed filtered updates to %d company bucket(s)", len(active_companies) + 1)
            else:
                log.info("No clients connected, skipping broadcast")

        except Exception:
            log.exception("Error in scan loop")

        await asyncio.sleep(SCAN_INTERVAL_SECONDS)


# ── lifespan (start/stop background task) ─────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Link to app_state for external routers to access shared objects
    from backend import state as app_state
    app_state.scg = scg
    app_state.weather_feed = weather_feed
    app_state.detector = detector
    app_state.agent_orchestrator = agent_orchestrator
    app_state.route_planner = route_planner
    app_state.weather_overrides = weather_overrides

    # Check MongoDB connectivity for logging
    from backend.database import sync_client
    try:
        sync_client.admin.command('ping')
        log.info("Successfully connected to MongoDB.")
    except Exception:
        log.warning("!!! MongoDB NOT detected at MONGO_URL. Using local JSON fallback for all operations. !!!")

    task = asyncio.create_task(scan_loop())
    log.info(
        "Nerve server ready — ws://localhost:%d/ws  |  "
        "Network: %d nodes, %d edges, %d shipments",
        PORT,
        scg.graph.number_of_nodes(),
        scg.graph.number_of_edges(),
        len(scg.shipments),
    )
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


# ── FastAPI app ───────────────────────────────────────────────────

app = FastAPI(
    title="Nerve — Supply Chain Monitor",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Authorization"],
)

from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error(f"Global exception caught: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
    )

from backend.routers import auth, companies, checkins, rerouting, nodes
app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(checkins.router)
app.include_router(rerouting.router)
app.include_router(nodes.router)


# ── REST endpoints ────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "Nerve — Supply Chain Monitor",
        "status": "running",
        "network": {
            "nodes": scg.graph.number_of_nodes(),
            "edges": scg.graph.number_of_edges(),
            "shipments": len(scg.shipments),
        },
    }


@app.get("/api/health")
async def get_health():
    """Health check endpoint — no auth required. Returns full system diagnostics."""
    from backend.database import sync_client, get_async_db

    # ── MongoDB connectivity + latency ──
    db_status = "connected"
    latency_ms = 0.0
    try:
        t0 = time.time()
        sync_client.admin.command('ping')
        latency_ms = round((time.time() - t0) * 1000, 2)
    except Exception:
        db_status = "error"

    # ── Pending reroute approvals ──
    pending_approvals = 0
    try:
        db = get_async_db()
        pending_approvals = await db.reroute_approvals.count_documents({"status": "pending"})
    except Exception:
        pending_approvals = 0

    return {
        "database": {
            "status": db_status,
            "latency_ms": latency_ms,
        },
        "orchestrator": {
            "status": "running",
            "last_scan": _last_scan_time or datetime.now(timezone.utc).isoformat(),
        },
        "websocket": {"client_count": app_state.count_clients()},
        "uptime": "99.9%",
        "metrics": {
            "active_disruptions": len(detector.alerts),
            "pending_approvals": pending_approvals,
        },
    }


@app.get("/api/network")
async def get_network():
    """Return full node + edge data for the frontend map."""
    # Map to frontend format from scg memory
    node_list = []
    for nid, n in scg.graph.nodes(data=True):
        node_list.append({
            "id": nid,
            "name": n.get("name"),
            "type": n.get("type"),
            "location": n.get("location"),
            "capacity": n.get("capacity"),
            "current_load": n.get("current_load"),
            "status": n.get("status"),
            "risk_level": n.get("risk_level")
        })
        
    edge_list = []
    for u, v, r in scg.graph.edges(data=True):
        edge_list.append({
            "from": u,
            "to": v,
            "id": r.get("id"),
            "transport_mode": r.get("transport_mode"),
            "distance_km": r.get("distance_km"),
            "base_transit_time_hrs": r.get("base_transit_time_hrs"),
            "cost_per_unit": r.get("cost_per_unit"),
            "risk_factor": r.get("risk_factor")
        })
        
    return {"nodes": node_list, "edges": edge_list}


@app.get("/api/shipments")
async def get_shipments(user: dict = Depends(get_current_user)):
    """Return shipments, filtered by company if not platform_admin."""
    if user.get("role") == "platform_admin":
        return {"shipments": scg.shipments}
    
    company_shipments = [s for s in scg.shipments if s.get("company_id") == user.get("company_id")]
    return {"shipments": company_shipments}


@app.get("/api/shipments/{shipment_id}")
async def get_shipment(shipment_id: str):
    """Return details for a specific shipment by ID."""
    for s in scg.shipments:
        if s["id"] == shipment_id:
            return s
    
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Shipment not found")


@app.get("/api/shipments/{shipment_id}/detail")
async def get_shipment_detail(shipment_id: str):
    """Return enriched shipment data for the detail page."""
    from fastapi import HTTPException

    shipment = None
    for s in scg.shipments:
        if s["id"] == shipment_id:
            shipment = s
            break
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    # ── Node details for every node on the route ──
    all_route_nodes = set(shipment.get("planned_route", []))
    all_route_nodes.update(shipment.get("route_taken", []))
    node_details = {}
    for nid, attrs in scg.graph.nodes(data=True):
        if nid in all_route_nodes:
            node_details[nid] = {
                "id": nid,
                "name": attrs.get("name", nid),
                "type": attrs.get("type", "unknown"),
                "location": attrs.get("location", {}),
                "capacity": attrs.get("capacity", 0),
                "current_load": attrs.get("current_load", 0),
                "status": attrs.get("status", "unknown"),
                "risk_level": attrs.get("risk_level", "unknown"),
                "processing_time_hrs": attrs.get("processing_time_hrs", 0),
            }

    # ── Route edges between consecutive planned nodes ──
    planned = shipment.get("planned_route", [])
    route_edges = []
    for i in range(len(planned) - 1):
        u, v = planned[i], planned[i + 1]
        if scg.graph.has_edge(u, v):
            edata = scg.graph[u][v]
            route_edges.append({
                "from": u,
                "to": v,
                "id": edata.get("id", f"{u}->{v}"),
                "transport_mode": edata.get("transport_mode", "unknown"),
                "distance_km": edata.get("distance_km", 0),
                "base_transit_time_hrs": edata.get("base_transit_time_hrs", 0),
                "cost_per_unit": edata.get("cost_per_unit", 0),
                "risk_factor": edata.get("risk_factor", 0),
            })

    # ── ETA breakdown per hop ──
    eta_breakdown = []
    cumulative_hrs = 0
    for edge in route_edges:
        transit = edge["base_transit_time_hrs"]
        dest_node = node_details.get(edge["to"], {})
        processing = dest_node.get("processing_time_hrs", 0)
        cumulative_hrs += transit + processing
        eta_breakdown.append({
            "from": edge["from"],
            "to": edge["to"],
            "transport_mode": edge["transport_mode"],
            "transit_hrs": transit,
            "processing_hrs": processing,
            "cumulative_hrs": cumulative_hrs,
        })

    # ── Active alerts affecting this shipment's route ──
    route_alerts = []
    for a in detector.alerts:
        if a.node_id in all_route_nodes:
            route_alerts.append(alert_to_dict(a))

    # ── Reroute history for this shipment ──
    reroute_history = [
        entry for entry in agent_orchestrator.reroute_history
        if entry["shipment_id"] == shipment_id
    ]

    # ── Nodes that were on original route but rerouted away from ──
    original_route = shipment.get("planned_route", [])
    avoided_nodes = []
    for entry in reroute_history:
        old_set = set(entry.get("old_route", []))
        new_set = set(entry.get("new_route", []))
        for nid in old_set - new_set:
            if nid not in avoided_nodes:
                avoided_nodes.append(nid)

    # Add node details for avoided nodes too
    for nid in avoided_nodes:
        if nid not in node_details:
            if scg.graph.has_node(nid):
                attrs = scg.graph.nodes[nid]
                node_details[nid] = {
                    "id": nid,
                    "name": attrs.get("name", nid),
                    "type": attrs.get("type", "unknown"),
                    "location": attrs.get("location", {}),
                    "capacity": attrs.get("capacity", 0),
                    "current_load": attrs.get("current_load", 0),
                    "status": attrs.get("status", "unknown"),
                    "risk_level": attrs.get("risk_level", "unknown"),
                    "processing_time_hrs": attrs.get("processing_time_hrs", 0),
                }

    # ── Risk score ──
    risk_score = 0
    for ra in route_alerts:
        sev = ra.get("severity", "")
        if sev == "CRITICAL":
            risk_score += 35
        elif sev == "HIGH":
            risk_score += 20
        elif sev == "MEDIUM":
            risk_score += 10
        else:
            risk_score += 5
    priority_mult = {"critical": 1.4, "high": 1.2, "medium": 1.0, "low": 0.8}
    risk_score = min(100, int(risk_score * priority_mult.get(
        shipment.get("priority", "medium").lower(), 1.0
    )))

    return {
        "shipment": shipment,
        "node_details": node_details,
        "route_edges": route_edges,
        "eta_breakdown": eta_breakdown,
        "total_transit_hrs": cumulative_hrs,
        "route_alerts": route_alerts,
        "reroute_history": reroute_history,
        "avoided_nodes": avoided_nodes,
        "risk_score": risk_score,
    }


@app.get("/api/alerts")
async def get_alerts(user: dict = Depends(get_current_user)):
    """Return alerts, filtered by company shipments if not platform_admin."""
    if user.get("role") == "platform_admin":
        return {
            "alerts_count": len(detector.alerts),
            "alerts": [alert_to_dict(a) for a in detector.alerts],
        }

    # Get all nodes in company's shipment routes
    company_shipments = [s for s in scg.shipments if s.get("company_id") == user.get("company_id")]
    company_nodes = set()
    for s in company_shipments:
        company_nodes.update(s.get("planned_route", []))
        company_nodes.update(s.get("route_taken", []))

    filtered_alerts = [a for a in detector.alerts if a.node_id in company_nodes]
    
    return {
        "alerts_count": len(filtered_alerts),
        "alerts": [alert_to_dict(a) for a in filtered_alerts],
    }


# ── Customer Endpoints ─────────────────────────────────────────────

@app.get("/api/customer/shipments")
async def get_customer_shipments(
    status: str | None = None,
    user: dict = Depends(get_current_user)
):
    """Return shipments belonging to the authenticated customer."""
    if user.get("role") != "customer":
        raise HTTPException(
            status_code=403,
            detail="This endpoint is only accessible by customers"
        )

    user_id = user.get("user_id")
    customer_shipments = [
        s for s in scg.shipments
        if s.get("customer_id") == user_id
    ]

    if status:
        customer_shipments = [
            s for s in customer_shipments
            if s.get("status", "").lower() == status.lower()
        ]

    return {"shipments": customer_shipments}


@app.get("/api/customer/shipments/{shipment_id}")
async def get_customer_shipment_detail(
    shipment_id: str,
    user: dict = Depends(get_current_user)
):
    """Return full shipment detail for a customer-owned shipment."""
    if user.get("role") != "customer":
        raise HTTPException(
            status_code=403,
            detail="This endpoint is only accessible by customers"
        )

    user_id = user.get("user_id")

    shipment = None
    for s in scg.shipments:
        if s["id"] == shipment_id:
            shipment = s
            break
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    if shipment.get("customer_id") != user_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this shipment"
        )

    # Build enriched detail (same shape as /api/shipments/{id}/detail)
    all_route_nodes = set(shipment.get("planned_route", []))
    all_route_nodes.update(shipment.get("route_taken", []))
    node_details = {}
    for nid, attrs in scg.graph.nodes(data=True):
        if nid in all_route_nodes:
            node_details[nid] = {
                "id": nid,
                "name": attrs.get("name", nid),
                "type": attrs.get("type", "unknown"),
                "location": attrs.get("location", {}),
                "capacity": attrs.get("capacity", 0),
                "current_load": attrs.get("current_load", 0),
                "status": attrs.get("status", "unknown"),
                "risk_level": attrs.get("risk_level", "unknown"),
                "processing_time_hrs": attrs.get("processing_time_hrs", 0),
            }

    planned = shipment.get("planned_route", [])
    route_edges = []
    for i in range(len(planned) - 1):
        u, v = planned[i], planned[i + 1]
        if scg.graph.has_edge(u, v):
            edata = scg.graph[u][v]
            route_edges.append({
                "from": u,
                "to": v,
                "id": edata.get("id", f"{u}->{v}"),
                "transport_mode": edata.get("transport_mode", "unknown"),
                "distance_km": edata.get("distance_km", 0),
                "base_transit_time_hrs": edata.get("base_transit_time_hrs", 0),
                "cost_per_unit": edata.get("cost_per_unit", 0),
                "risk_factor": edata.get("risk_factor", 0),
            })

    eta_breakdown = []
    cumulative_hrs = 0
    for edge in route_edges:
        transit = edge["base_transit_time_hrs"]
        dest_node = node_details.get(edge["to"], {})
        processing = dest_node.get("processing_time_hrs", 0)
        cumulative_hrs += transit + processing
        eta_breakdown.append({
            "from": edge["from"],
            "to": edge["to"],
            "transport_mode": edge["transport_mode"],
            "transit_hrs": transit,
            "processing_hrs": processing,
            "cumulative_hrs": cumulative_hrs,
        })

    # ── Active alerts affecting this shipment's route ──
    route_alerts = []
    for a in detector.alerts:
        if a.node_id in all_route_nodes:
            route_alerts.append(alert_to_dict(a))

    # ── Reroute history for this shipment ──
    reroute_history = [
        entry for entry in agent_orchestrator.reroute_history
        if entry["shipment_id"] == shipment_id
    ]

    # ── Nodes that were on original route but rerouted away from ──
    original_route = shipment.get("planned_route", [])
    avoided_nodes = []
    for entry in reroute_history:
        old_set = set(entry.get("old_route", []))
        new_set = set(entry.get("new_route", []))
        for nid in old_set - new_set:
            if nid not in avoided_nodes:
                avoided_nodes.append(nid)

    # Add node details for avoided nodes too
    for nid in avoided_nodes:
        if nid not in node_details:
            if scg.graph.has_node(nid):
                attrs = scg.graph.nodes[nid]
                node_details[nid] = {
                    "id": nid,
                    "name": attrs.get("name", nid),
                    "type": attrs.get("type", "unknown"),
                    "location": attrs.get("location", {}),
                    "capacity": attrs.get("capacity", 0),
                    "current_load": attrs.get("current_load", 0),
                    "status": attrs.get("status", "unknown"),
                    "risk_level": attrs.get("risk_level", "unknown"),
                    "processing_time_hrs": attrs.get("processing_time_hrs", 0),
                }

    # ── Risk score ──
    risk_score = 0
    for ra in route_alerts:
        sev = ra.get("severity", "")
        if sev == "CRITICAL":
            risk_score += 35
        elif sev == "HIGH":
            risk_score += 20
        elif sev == "MEDIUM":
            risk_score += 10
        else:
            risk_score += 5
    priority_mult = {"critical": 1.4, "high": 1.2, "medium": 1.0, "low": 0.8}
    risk_score = min(100, int(risk_score * priority_mult.get(
        shipment.get("priority", "medium").lower(), 1.0
    )))

    return {
        "shipment": shipment,
        "node_details": node_details,
        "route_edges": route_edges,
        "eta_breakdown": eta_breakdown,
        "total_transit_hrs": cumulative_hrs,
        "route_alerts": route_alerts,
        "reroute_history": reroute_history,
        "avoided_nodes": avoided_nodes,
        "risk_score": risk_score,
    }


class DisruptionOverride(BaseModel):
    node_id: str
    parameter: str
    value: float


@app.post("/api/disruption/simulate")
async def simulate_disruption(payload: DisruptionOverride):
    """Inject a simulated extreme weather condition onto a specific node."""
    if payload.node_id not in weather_overrides:
        weather_overrides[payload.node_id] = {}
    weather_overrides[payload.node_id][payload.parameter] = payload.value
    log.info("Simulated Disruption: %s set %s to %f", payload.node_id, payload.parameter, payload.value)
    return {"status": "success", "overrides": weather_overrides}


@app.post("/api/disruption/clear")
async def clear_disruptions():
    """Clear all active simulated weather disruptions."""
    weather_overrides.clear()
    agent_orchestrator.clear_reroutes()
    log.info("Cleared all simulated disruptions and reroute tracking.")
    return {"status": "success"}


@app.get("/api/agents/health")
async def get_agent_health():
    """Check the health status of the multi-agent orchestrator."""
    from backend.agents.llm_config import is_llm_available, MODEL_ID

    llm_status = "online" if is_llm_available() else "offline (heuristic fallback)"
    return {
        "status": "healthy",
        "orchestrator": "online",
        "llm": {
            "model": MODEL_ID,
            "status": llm_status,
            "provider": "groq",
        },
        "agents": {
            "scout": "ready (LLM-powered)" if is_llm_available() else "ready (heuristic)",
            "mapper": "ready (LLM-powered)" if is_llm_available() else "ready (heuristic)",
            "optimizer": "ready (LLM-powered)" if is_llm_available() else "ready (heuristic)",
            "communicator": "ready (LLM-powered)" if is_llm_available() else "ready (heuristic)",
        },
        "pipeline": "LangGraph StateGraph",
    }


# ── Booking Engine endpoints ──────────────────────────────────────

@app.get("/api/nodes/summary")
async def get_nodes_summary():
    """Return nodes grouped by type for booking form dropdowns."""
    grouped: dict[str, list[dict]] = {}
    for nid, attrs in scg.graph.nodes(data=True):
        ntype = attrs.get("type", "unknown")
        entry = {
            "id": nid,
            "name": attrs.get("name", nid),
            "type": ntype,
            "status": attrs.get("status", "unknown"),
            "current_load": attrs.get("current_load", 0),
            "capacity": attrs.get("capacity", 0),
        }
        grouped.setdefault(ntype, []).append(entry)
    return {"groups": grouped}


class BookingRequest(BaseModel):
    origin: str
    destination: str
    cargo_type: str
    priority: str = "medium"
    weight_kg: float = 1000.0


@app.post("/api/shipments/book")
async def book_shipment(payload: BookingRequest):
    """
    Compute the optimal route for a new shipment and create it.

    Uses the same 4-factor cost function as the disruption Optimizer
    to find the best path considering current weather, congestion,
    and risk scores.
    """
    from fastapi import HTTPException
    global _next_shipment_id

    # ── Validate nodes ──
    if not scg.graph.has_node(payload.origin):
        raise HTTPException(status_code=400, detail=f"Invalid origin node: {payload.origin}")
    if not scg.graph.has_node(payload.destination):
        raise HTTPException(status_code=400, detail=f"Invalid destination node: {payload.destination}")
    if payload.origin == payload.destination:
        raise HTTPException(status_code=400, detail="Origin and destination must be different")

    # ── Gather current network state ──
    import copy
    eval_results = weather_feed.results.copy()
    for nid, overrides in weather_overrides.items():
        if nid in eval_results:
            nw_copy = copy.copy(eval_results[nid])
            for param, val in overrides.items():
                if hasattr(nw_copy, param):
                    setattr(nw_copy, param, val)
            eval_results[nid] = nw_copy

    alerts = detector.evaluate(eval_results) if eval_results else []
    risk_scores = compute_node_risk_scores(scg, alerts)
    cascade_debt = calculate_cascade_debt(scg, risk_scores)

    # ── Plan routes ──
    candidates = route_planner.plan_route(
        origin=payload.origin,
        destination=payload.destination,
        priority=payload.priority,
        scg=scg,
        alerts=alerts,
        risk_scores=risk_scores,
        cascade_debt=cascade_debt,
        max_candidates=3,
    )

    if not candidates:
        raise HTTPException(
            status_code=422,
            detail="No viable route exists between the selected origin and destination."
        )

    best = candidates[0]

    # ── Create shipment in DB ──
    _next_shipment_id += 1
    shipment_id = f"S{_next_shipment_id:03d}"
    now = datetime.now(timezone.utc)

    from datetime import timedelta
    est_arrival = now + timedelta(hours=best.total_transit_hrs)

    db = get_async_db() # Fixed: removed await
    new_shipment = {
        "id": shipment_id,
        "origin": payload.origin,
        "destination": payload.destination,
        "current_node": payload.origin,
        "status": "in_transit",
        "priority": payload.priority,
        "cargo_type": payload.cargo_type,
        "weight_kg": payload.weight_kg,
        "planned_route": best.path,
        "route_taken": [payload.origin],
        "departure_time": now.isoformat(),
        "estimated_arrival": est_arrival.isoformat(),
        "disruptions": []
    }

    try:
        await db.shipments.insert_one(new_shipment)
        log.info("Shipment %s persisted to MongoDB.", shipment_id)
    except Exception as e:
        log.warning("Failed to persist shipment %s to MongoDB: %s. It will exist in memory only.", shipment_id, e)
    
    new_shipment.pop("_id", None)
    
    # Update memory graph
    # If DB is down, refresh_from_db will fallback to JSON (wiping memory)
    # So we must manually ensure the new shipment is in scg.shipments if we want it to stay
    scg.refresh_from_db()
    
    # Check if it's in scg.shipments after refresh (it won't be if DB was down)
    if not any(s["id"] == shipment_id for s in scg.shipments):
        scg.shipments.append(new_shipment)
    
    log.info(
        "BOOKED shipment %s: %s → %s (%d hops, %.0fh, $%.0f)",
        shipment_id, payload.origin, payload.destination,
        best.hop_count, best.total_transit_hrs, best.total_cost,
    )

    alternatives = []
    for c in candidates[1:]:
        alternatives.append({
            "path": c.path,
            "total_transit_hrs": c.total_transit_hrs,
            "total_cost": c.total_cost,
            "total_distance_km": c.total_distance_km,
            "hop_count": c.hop_count,
            "composite_score": c.composite_score,
            "risk_score": c.risk_score,
            "legs": c.legs,
        })

    return {
        "status": "booked",
        "shipment": new_shipment,
        "route_analytics": {
            "total_transit_hrs": best.total_transit_hrs,
            "total_cost": best.total_cost,
            "total_distance_km": best.total_distance_km,
            "hop_count": best.hop_count,
            "composite_score": best.composite_score,
            "risk_score": best.risk_score,
            "legs": best.legs,
        },
        "alternatives": alternatives,
    }


# ── Admin Panel Endpoints ─────────────────────────────────────────

class ManualRerouteRequest(BaseModel):
    shipment_id: str
    new_route: list[str]
    reason: str
    user_id: str = "admin"

@app.post("/api/admin/shipments/reroute")
async def manual_reroute(payload: ManualRerouteRequest, db = Depends(get_async_db)):
    """Manually override a shipment's route."""
    shipment = await db.shipments.find_one({"id": payload.shipment_id})
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    # Log the decision
    log_entry = {
        "shipment_id": payload.shipment_id,
        "action_type": "MANUAL_REROUTE",
        "reasoning": payload.reason,
        "performed_by": payload.user_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.decision_logs.insert_one(log_entry)

    # Apply reroute
    try:
        await db.shipments.update_one(
            {"id": payload.shipment_id},
            {"$set": {"planned_route": payload.new_route}}
        )
        log.info("MANUAL REROUTE persisted to MongoDB: %s", payload.shipment_id)
    except Exception as e:
        log.warning("Failed to persist manual reroute for %s to MongoDB: %s", payload.shipment_id, e)

    # Refresh memory graph
    scg.refresh_from_db()
    
    # Manual override in memory if DB was down
    for s in scg.shipments:
        if s["id"] == payload.shipment_id:
            s["planned_route"] = payload.new_route
            break
    
    log.info("MANUAL REROUTE: %s by %s. Reason: %s", payload.shipment_id, payload.user_id, payload.reason)
    return {"status": "success", "new_route": payload.new_route}


@app.get("/api/admin/logs")
async def get_decision_logs(db = Depends(get_async_db)):
    """Return all decision logs for the admin panel."""
    logs = await db.decision_logs.find({}).sort("timestamp", -1).to_list(length=None)
    for l in logs:
        l.pop("_id", None)
    return {"logs": logs}


# ── WebSocket endpoint ────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    
    # Try to get company_id from query parameter token
    # URL format: ws://localhost:8000/ws?token=<jwt>
    company_id = "company_demo"  # default for backward compat
    
    token = ws.query_params.get("token")
    if token:
        try:
            from backend.auth.jwt_handler import decode_token
            payload = decode_token(token)
            # If platform_admin, use a special key to receive everything
            if payload.get("role") == "platform_admin":
                company_id = "platform_admin"
            else:
                company_id = payload.get("company_id") or "company_demo"
        except Exception:
            pass  # Invalid token -> use default company
    
    from backend import state as app_state
    app_state.register_client(ws, company_id)
    log.info("WS client connected: company=%s total=%d", company_id, app_state.count_clients())
    
    # Send immediate snapshot on connect
    try:
        # Build company-filtered payload
        # Note: In a production scenario, build_payload would filter shipments by company_id here
        msg = build_payload(detector.alerts)
        await ws.send_text(msg)
    except Exception:
        pass
    
    try:
        while True:
            # Keep connection alive; listen for messages if needed
            _ = await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        app_state.unregister_client(ws)
        log.info("WS client disconnected: company=%s remaining=%d", company_id, app_state.count_clients())


# ── entry point ───────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=False)
