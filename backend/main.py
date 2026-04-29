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
import os

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
SCAN_INTERVAL_SECONDS = int(os.getenv("SCAN_INTERVAL_SECONDS", "10"))
HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", "8000"))
ENABLE_BACKGROUND_SCANNER = os.getenv("ENABLE_BACKGROUND_SCANNER", "true").strip().lower() == "true"

# ── shared state ──────────────────────────────────────────────────
scg = SupplyChainGraph()
weather_feed = WeatherFeed(dict(scg.graph.nodes(data=True)))
detector = AnomalyDetector()
agent_orchestrator = AgentOrchestrator()
route_planner = RoutePlanner()

# Counters and persistent state are now handled in the database.

# active weather overrides for simulation
weather_overrides: dict[str, dict[str, float]] = {}

# Link to app_state for external routers to access shared objects
from backend import state as app_state
from backend.state import alert_to_dict
from backend.serializers import clean_doc, clean_list
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

async def broadcast(message: str) -> None:
    """Send a message to every connected WebSocket client via shared state."""
    await app_state.broadcast_to_all(message)


# ── auto-seeding ──────────────────────────────────────────────────
async def ensure_seeded():
    """Seed the database with initial nodes and demo users if empty."""
    from backend.database import get_async_db
    db = get_async_db()
    try:
        user_count = await db.users.count_documents({})
        if user_count == 0:
            log.info("Database is empty. Running auto-seed...")
            from backend.seed_data import seed_data
            await seed_data()
            log.info("Auto-seed successful.")
        else:
            log.info("Database already contains data (%d users). Skipping auto-seed.", user_count)
            log.info("DEMO USERS AVAILABLE: admin@ex.com, owner@solarisglobal.com, manager@solarisglobal.com (Pass: solarisglobal-owner/manager)")
    except Exception as e:
        log.error("Auto-seed check/execution failed. If this is production, check your MongoDB Atlas whitelisting and TLS settings.")
        log.error("Error Detail: %s", e)


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
            agent_logs, _, _ = await agent_orchestrator.process_anomalies(
                alerts, scg,
                risk_scores=risk_scores,
                cascade_debt=cascade_debt
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
                # Iterate through all connected companies (including platform_admin)
                active_companies = list(app_state.clients.keys())
                for cid in active_companies:
                    # Determine network_health. If platform_admin, pass it through, otherwise recompute inside helper.
                    c_health = network_health if cid == "platform_admin" else None
                    
                    c_msg = app_state.build_company_payload(
                        company_id=cid,
                        agent_logs=agent_logs,
                        risk_scores=risk_scores,
                        cascade_debt=cascade_debt,
                        network_health=c_health
                    )
                    await app_state.broadcast_to_company(c_msg, cid)
                
                log.info("Pushed filtered updates to %d company bucket(s)", len(active_companies))
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

    # Check MongoDB connectivity in background
    async def check_db():
        from backend.database import sync_client
        try:
            # Short timeout for initial check
            sync_client.admin.command('ping')
            log.info("Successfully connected to MongoDB.")
        except Exception as e:
             log.warning(
                "MongoDB is not reachable yet. API is online but data-dependent features will fail. Error: %s",
                str(e)
            )

    asyncio.create_task(check_db())

    # Startup
    log.info("Nerve Backend starting up...")
    asyncio.create_task(ensure_seeded()) # Non-blocking seeding
    if ENABLE_BACKGROUND_SCANNER:
        scan_task = asyncio.create_task(scan_loop())
    else:
        log.warning("Background scanner is DISABLED.")
        scan_task = None
    
    log.info(
        "Nerve server ready — PORT: %d | "
        "Network: %d nodes, %d edges, %d shipments",
        PORT,
        scg.graph.number_of_nodes(),
        scg.graph.number_of_edges(),
        len(scg.shipments),
    )
    yield
    if scan_task is not None:
        scan_task.cancel()
        try:
            await scan_task
        except asyncio.CancelledError:
            pass


# ── FastAPI app ───────────────────────────────────────────────────

app = FastAPI(
    title="Nerve — Supply Chain Monitor",
    version="0.1.0",
    lifespan=lifespan,
)

app_env = os.getenv("APP_ENV", "development").strip().lower()
cors_origins_str = os.getenv("CORS_ALLOWED_ORIGINS", "")

allowed_origins = [o.strip() for o in cors_origins_str.split(",") if o.strip()]

if not allowed_origins:
    # Always include common local development origins
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:5174", 
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    if app_env == "production":
        # In production without explicit origins, log a warning but don't block
        import logging
        logging.getLogger("nerve").warning(
            "CORS_ALLOWED_ORIGINS not set in production. "
            "Add your frontend URL to environment variables."
        )

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error(f"Global exception caught: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": (
                f"Internal Server Error: {str(exc)}"
                if app_env == "development"
                else "Internal Server Error"
            )
        },
    )

from backend.routers import auth, companies, checkins, rerouting, nodes, owner, admin, simulation
app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(checkins.router)
app.include_router(rerouting.router)
app.include_router(nodes.router)
app.include_router(owner.router)
app.include_router(admin.router)
app.include_router(simulation.router)


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
async def get_network(user: dict = Depends(get_current_user)):
    """Return node + edge data filtered by company ownership and node assignment."""
    is_admin = user.get("role") == "platform_admin"
    is_operator = user.get("role") == "node_operator"
    comp_id = user.get("company_id")
    assigned_nodes = set(user.get("assigned_node_ids", []))
    
    # Map to frontend format from scg memory
    node_list = []
    for nid, n in scg.graph.nodes(data=True):
        if is_admin:
            authorized = True
        elif is_operator:
            authorized = nid in assigned_nodes
        elif comp_id:
            authorized = n.get("company_id") == comp_id
        else:
            authorized = False
            
        if authorized:
            node_list.append({"id": nid, **n})
        
    edge_list = []
    for u, v, r in scg.graph.edges(data=True):
        if is_admin:
            authorized = True
        elif is_operator:
            authorized = u in assigned_nodes and v in assigned_nodes
        elif comp_id:
            authorized = r.get("company_id") == comp_id
        else:
            authorized = False
            
        if authorized:
             edge_list.append({"from": u, "to": v, **r})

    # 3. Weather Data
    weather_list = []
    if weather_feed:
        auth_node_ids = set(n["id"] for n in node_list)
        for nw in weather_feed.results.values():
            if nw.fetched and nw.node_id in auth_node_ids:
                weather_list.append({
                    "node_id": nw.node_id,
                    "node_name": nw.node_name,
                    "temperature_c": nw.temperature_c,
                    "condition": nw.weather_label
                })
    
    return {
        "nodes": node_list, 
        "edges": edge_list,
        "weather": weather_list
    }


@app.get("/api/shipments")
async def get_shipments(
    node_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Return shipments, filtered by company or node assignment."""
    if user.get("role") == "platform_admin":
        if node_id:
            return {"shipments": [s for s in scg.shipments if s.get("current_node") == node_id]}
        return {"shipments": scg.shipments}
    
    if user.get("role") == "node_operator":
        assigned_nodes = set(user.get("assigned_node_ids", []))
        
        # If node_id is provided, verify operator is assigned to it
        if node_id:
            if node_id not in assigned_nodes:
                raise HTTPException(status_code=403, detail="Not authorized to view shipments for this node")
            
            # Filter shipments: coming to this node, leaving from this node, or currently AT this node
            node_shipments = [
                s for s in scg.shipments 
                if s.get("company_id") == user.get("company_id") and
                (s.get("current_node") == node_id or node_id in s.get("planned_route", []))
            ]
            return {"shipments": node_shipments}

        # Legacy behavior: all assigned nodes
        company_shipments = [
            s for s in scg.shipments 
            if s.get("company_id") == user.get("company_id") and
            (set(s.get("planned_route", [])) & assigned_nodes or set(s.get("route_taken", [])) & assigned_nodes)
        ]
        return {"shipments": company_shipments}
    
    # Manager / Owner
    query_comp_id = user.get("company_id")
    company_shipments = [s for s in scg.shipments if s.get("company_id") == query_comp_id]
    if node_id:
        company_shipments = [s for s in company_shipments if s.get("current_node") == node_id or node_id in s.get("planned_route", [])]
        
    return {"shipments": company_shipments}


@app.get("/api/shipments/{shipment_id}")
async def get_shipment(shipment_id: str, user: dict = Depends(get_current_user)):
    """Return details for a specific shipment, verifying company access."""
    for s in scg.shipments:
        if s["id"] == shipment_id:
            if user.get("role") != "platform_admin" and s.get("company_id") != user.get("company_id"):
                raise HTTPException(status_code=403, detail="Access denied")
            return s
    
    raise HTTPException(status_code=404, detail="Shipment not found")


@app.get("/api/shipments/{shipment_id}/detail")
async def get_shipment_detail(shipment_id: str, user: dict = Depends(get_current_user), db = Depends(get_async_db)):
    """Return enriched shipment data, verifying company access."""
    from fastapi import HTTPException

    shipment = None
    for s in scg.shipments:
        if s["id"] == shipment_id:
            if user.get("role") != "platform_admin" and s.get("company_id") != user.get("company_id"):
                raise HTTPException(status_code=403, detail="Access denied")
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
    history_docs = await db.reroute_history.find({"shipment_id": shipment_id}).to_list(length=None)
    reroute_history = clean_list(history_docs)

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
    """Return alerts, filtered by company or assigned nodes."""
    if user.get("role") == "platform_admin":
        return {
            "alerts_count": len(detector.alerts),
            "alerts": [alert_to_dict(a) for a in detector.alerts],
        }

    if user.get("role") == "node_operator":
        assigned_nodes = set(user.get("assigned_node_ids", []))
        filtered_alerts = [a for a in detector.alerts if a.node_id in assigned_nodes]
        return {
            "alerts_count": len(filtered_alerts),
            "alerts": [alert_to_dict(a) for a in filtered_alerts],
        }

    # Logistics Manager: get all nodes in company's shipment routes
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
    user: dict = Depends(get_current_user),
    db = Depends(get_async_db)
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
    history_docs = await db.reroute_history.find({"shipment_id": shipment_id}).to_list(length=None)
    reroute_history = clean_list(history_docs)

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
async def book_shipment(payload: BookingRequest, user: dict = Depends(get_current_user)):
    """
    Compute the optimal route for a new shipment and create it.

    Uses the same 4-factor cost function as the disruption Optimizer
    to find the best path considering current weather, congestion,
    and risk scores.
    """
    from fastapi import HTTPException

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
    db = get_async_db()
    
    # Persistent counter for shipment IDs
    counter = await db.counters.find_one_and_update(
        {"_id": "shipment_id"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    seq = counter.get("seq", 100)
    shipment_id = f"S{seq:03d}"
    
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
        "disruptions": [],
        "company_id": user.get("company_id"),
        "customer_id": user.get("username") if user.get("role") == "customer" else None
    }

    try:
        await db.shipments.insert_one(new_shipment)
        log.info("Shipment %s persisted to MongoDB.", shipment_id)
    except Exception as e:
        log.warning("Failed to persist shipment %s to MongoDB: %s. It will exist in memory only.", shipment_id, e)
    
    # Update memory graph
    scg.refresh_from_db()
    
    # If DB was down, the new shipment won't be in scg.shipments.
    # We return the object but don't force mutate scg.shipments anymore, 
    # as MongoDB is the source of truth.

    
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
        "shipment": clean_doc(new_shipment),
        "route_analytics": {
            "total_transit_hrs": best.total_transit_hrs,
            "total_cost": best.total_cost,
            "total_distance_km": best.total_distance_km,
            "hop_count": best.hop_count,
            "composite_score": best.composite_score,
            "risk_score": best.risk_score,
            "legs": best.legs,
            "path": best.path,
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
async def manual_reroute(
    payload: ManualRerouteRequest, 
    user: dict = Depends(get_current_user),
    db = Depends(get_async_db)
):
    """Manually override a shipment's route with auth and company scoping."""
    shipment = await db.shipments.find_one({"id": payload.shipment_id})
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    # Auth check: Platform admin sees all. Owner/Manager see company.
    is_admin = user.get("role") == "platform_admin"
    is_authorized_role = user.get("role") in ["company_owner", "logistics_manager"]
    is_same_company = shipment.get("company_id") == user.get("company_id")

    if not (is_admin or (is_authorized_role and is_same_company)):
        raise HTTPException(status_code=403, detail="Not authorized to reroute this shipment")

    # Log the decision
    log_entry = {
        "shipment_id": payload.shipment_id,
        "action_type": "MANUAL_REROUTE",
        "reasoning": payload.reason,
        "performed_by": user.get("user_id"),
        "company_id": shipment.get("company_id"),
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

    # Refresh memory graph from DB (source of truth)
    scg.refresh_from_db()

    # Broadcast update
    company_id = shipment.get("company_id")
    if company_id:
        from backend.state import build_company_payload, broadcast_to_company
        import json
        msg = build_company_payload(company_id)
        await broadcast_to_company(json.loads(msg), company_id)
        
    admin_msg = build_company_payload("platform_admin")
    await broadcast_to_company(json.loads(admin_msg), "platform_admin")
    
    log.info("MANUAL REROUTE: %s by %s. Reason: %s", payload.shipment_id, user.get("user_id"), payload.reason)
    return {"status": "success", "new_route": payload.new_route}


@app.get("/api/admin/logs")
async def get_decision_logs(
    user: dict = Depends(get_current_user),
    db = Depends(get_async_db)
):
    """Return decision logs, filtered by company for managers/owners."""
    query = {}
    if user.get("role") != "platform_admin":
        query["company_id"] = user.get("company_id")

    logs = await db.decision_logs.find(query).sort("timestamp", -1).to_list(length=None)
    return {"logs": clean_list(logs)}



# ── WebSocket endpoint ────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    
    # REQUIRE token for WebSocket
    company_id = None
    
    token = ws.query_params.get("token")
    if token:
        try:
            from backend.auth.jwt_handler import decode_token
            payload = decode_token(token)
            # If platform_admin, use a special key to receive everything
            if payload.get("role") == "platform_admin":
                company_id = "platform_admin"
            else:
                company_id = payload.get("company_id")
                if not company_id:
                    log.warning("WS connection attempted with valid token but missing company_id")
                    await ws.close(code=4003) # Forbidden
                    return
        except Exception as e:
            log.error("WS authentication failed: %s", e)
            await ws.close(code=4001)
            return
    else:
        log.warning("WS connection attempted without token")
        await ws.close(code=4001)
        return
    from backend import state as app_state
    app_state.register_client(ws, company_id)
    log.info("WS client connected: company=%s total=%d", company_id, app_state.count_clients())
    
    # Send immediate snapshot on connect
    try:
        msg = app_state.build_company_payload(company_id=company_id)
        await ws.send_text(msg)
    except Exception as e:
        log.error("Failed to send initial websocket snapshot for company %s: %s", company_id, e)
    
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
