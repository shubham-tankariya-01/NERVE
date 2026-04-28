"""
simulation.py
Disruption Simulation API for company owners and logistics managers.
Allows manual injection of weather-based disruptions per node,
triggers the full agent pipeline immediately, and returns agent results.

Disruption parameter ranges that GUARANTEE alerts from AnomalyDetector:
  wind_speed_kmh   : 40–120  (threshold: medium=40, high=60, critical=80)
  wind_gusts_kmh   : 55–130  (threshold: medium=55, high=80, critical=100)
  precipitation_mm : 5–50    (threshold: medium=5, high=15, critical=30)
  temperature_c    :
    heat: 40–55              (threshold: medium=40, high=44, critical=48)
    cold: -10 to -40         (threshold: medium=-10, high=-20, critical=-30)
  weather_code     : 61–99   (threshold: medium=61, high=75, critical=95)
    61=slight rain, 65=heavy rain, 75=heavy snow, 95=thunderstorm, 99=thunderstorm+hail
"""

from __future__ import annotations

import copy
import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.auth.dependencies import get_current_user, require_role
from backend.database import get_async_db
from backend import state as app_state
from backend.serializers import clean_list

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])


# ── Pydantic Models ──────────────────────────────────────────────────

class DisruptionParameter(BaseModel):
    parameter: str  # wind_speed_kmh | wind_gusts_kmh | precipitation_mm | temperature_c | temperature_heat_c | temperature_cold_c | weather_code
    value: float


class SimulationRequest(BaseModel):
    node_id: str
    parameters: List[DisruptionParameter]
    scenario_name: Optional[str] = "Custom Simulation"


class ManualDisruptionPayload(BaseModel):
    shipment_id: str
    reason: str
    delay_hrs: float
    disruption_type: str  # weather | port_congestion | customs_hold | mechanical | infrastructure | safety | other
    notes: Optional[str] = None


# ── Parameter Catalogue ──────────────────────────────────────────────

PARAMETER_CATALOGUE = {
    "parameters": [
        {
            "id": "wind_speed_kmh",
            "label": "Wind Speed",
            "unit": "km/h",
            "icon": "wind",
            "min": 0,
            "max": 120,
            "safe_max": 39,
            "disruption_ranges": [
                {"label": "Moderate", "min": 40, "max": 59, "severity": "MEDIUM", "color": "#FFB020"},
                {"label": "High Winds", "min": 60, "max": 79, "severity": "HIGH", "color": "#FF8C00"},
                {"label": "Storm Force", "min": 80, "max": 120, "severity": "CRITICAL", "color": "#FF4D4D"},
            ],
            "default_simulate_value": 75,
        },
        {
            "id": "wind_gusts_kmh",
            "label": "Wind Gusts",
            "unit": "km/h",
            "icon": "wind",
            "min": 0,
            "max": 130,
            "safe_max": 54,
            "disruption_ranges": [
                {"label": "Gusty", "min": 55, "max": 79, "severity": "MEDIUM", "color": "#FFB020"},
                {"label": "Dangerous Gusts", "min": 80, "max": 99, "severity": "HIGH", "color": "#FF8C00"},
                {"label": "Extreme Gusts", "min": 100, "max": 130, "severity": "CRITICAL", "color": "#FF4D4D"},
            ],
            "default_simulate_value": 90,
        },
        {
            "id": "precipitation_mm",
            "label": "Precipitation",
            "unit": "mm/h",
            "icon": "rain",
            "min": 0,
            "max": 50,
            "safe_max": 4,
            "disruption_ranges": [
                {"label": "Heavy Drizzle", "min": 5, "max": 14, "severity": "MEDIUM", "color": "#FFB020"},
                {"label": "Heavy Rain", "min": 15, "max": 29, "severity": "HIGH", "color": "#FF8C00"},
                {"label": "Torrential", "min": 30, "max": 50, "severity": "CRITICAL", "color": "#FF4D4D"},
            ],
            "default_simulate_value": 20,
        },
        {
            "id": "temperature_heat_c",
            "label": "Extreme Heat",
            "unit": "°C",
            "icon": "thermometer",
            "min": 38,
            "max": 55,
            "safe_max": 39,
            "disruption_ranges": [
                {"label": "Heat Advisory", "min": 40, "max": 43, "severity": "MEDIUM", "color": "#FFB020"},
                {"label": "Dangerous Heat", "min": 44, "max": 47, "severity": "HIGH", "color": "#FF8C00"},
                {"label": "Extreme Heat", "min": 48, "max": 55, "severity": "CRITICAL", "color": "#FF4D4D"},
            ],
            "default_simulate_value": 46,
            "maps_to": "temperature_c",
        },
        {
            "id": "temperature_cold_c",
            "label": "Extreme Cold",
            "unit": "°C",
            "icon": "thermometer",
            "min": -40,
            "max": -8,
            "safe_max": -9,
            "disruption_ranges": [
                {"label": "Cold Advisory", "min": -10, "max": -19, "severity": "MEDIUM", "color": "#FFB020"},
                {"label": "Hard Freeze", "min": -20, "max": -29, "severity": "HIGH", "color": "#FF8C00"},
                {"label": "Arctic Blast", "min": -30, "max": -40, "severity": "CRITICAL", "color": "#FF4D4D"},
            ],
            "default_simulate_value": -25,
            "maps_to": "temperature_c",
        },
        {
            "id": "weather_code",
            "label": "Weather Event",
            "unit": "WMO code",
            "icon": "cloud",
            "min": 0,
            "max": 99,
            "safe_max": 60,
            "disruption_ranges": [
                {"label": "Rain", "min": 61, "max": 74, "severity": "MEDIUM", "color": "#FFB020"},
                {"label": "Snow / Blizzard", "min": 75, "max": 94, "severity": "HIGH", "color": "#FF8C00"},
                {"label": "Thunderstorm", "min": 95, "max": 99, "severity": "CRITICAL", "color": "#FF4D4D"},
            ],
            "presets": [
                {"label": "Slight Rain", "value": 61},
                {"label": "Heavy Rain", "value": 65},
                {"label": "Heavy Snow", "value": 75},
                {"label": "Thunderstorm", "value": 95},
                {"label": "Thunderstorm + Hail", "value": 99},
            ],
            "default_simulate_value": 95,
        },
    ],
    "preset_scenarios": [
        {
            "id": "tropical_storm",
            "label": "Tropical Storm",
            "description": "High winds with heavy rain and thunderstorm conditions",
            "icon": "🌀",
            "parameters": [
                {"parameter": "wind_speed_kmh", "value": 85},
                {"parameter": "wind_gusts_kmh", "value": 110},
                {"parameter": "precipitation_mm", "value": 35},
                {"parameter": "weather_code", "value": 99},
            ],
            "expected_severity": "CRITICAL",
        },
        {
            "id": "blizzard",
            "label": "Blizzard",
            "description": "Extreme cold with heavy snow and high wind gusts",
            "icon": "❄️",
            "parameters": [
                {"parameter": "temperature_c", "value": -28},
                {"parameter": "wind_gusts_kmh", "value": 95},
                {"parameter": "weather_code", "value": 75},
            ],
            "expected_severity": "CRITICAL",
        },
        {
            "id": "heat_wave",
            "label": "Heat Wave",
            "description": "Extreme temperatures affecting outdoor operations",
            "icon": "🔥",
            "parameters": [
                {"parameter": "temperature_c", "value": 49},
            ],
            "expected_severity": "CRITICAL",
        },
        {
            "id": "heavy_rain",
            "label": "Heavy Rainfall",
            "description": "Intense precipitation causing flooding risk",
            "icon": "🌧️",
            "parameters": [
                {"parameter": "precipitation_mm", "value": 22},
                {"parameter": "weather_code", "value": 65},
            ],
            "expected_severity": "HIGH",
        },
        {
            "id": "high_winds",
            "label": "High Wind Event",
            "description": "Strong sustained winds with dangerous gusts",
            "icon": "💨",
            "parameters": [
                {"parameter": "wind_speed_kmh", "value": 70},
                {"parameter": "wind_gusts_kmh", "value": 95},
            ],
            "expected_severity": "HIGH",
        },
    ],
}


# ── Endpoints ────────────────────────────────────────────────────────

@router.get("/parameters")
async def get_simulation_parameters(user: dict = Depends(get_current_user)):
    """Returns the full parameter catalogue with ranges, labels, units, and preset scenarios."""
    return PARAMETER_CATALOGUE


@router.post("/trigger")
async def trigger_simulation(
    payload: SimulationRequest,
    user: dict = Depends(require_role("company_owner", "logistics_manager", "platform_admin")),
    db=Depends(get_async_db),
):
    """
    Triggers a disruption simulation:
    1. Applies weather parameter overrides to the specified node
    2. Re-runs anomaly detection immediately (don't wait for scan_loop)
    3. Runs the full LangGraph agent pipeline synchronously
    4. Saves all reroute suggestions to reroute_approvals collection
    5. Returns simulation results including agent logs and suggested reroutes
    6. Does NOT clear overrides — they persist until /api/simulation/clear/{node_id}
    """
    company_id = user.get("company_id")

    # 1. Verify node belongs to company
    if user.get("role") != "platform_admin":
        node_in_db = await db.nodes.find_one(
            {"id": payload.node_id, "company_id": company_id}
        )
        if not node_in_db:
            raise HTTPException(
                status_code=404,
                detail="Node not found in your company network",
            )

    # 2. Apply weather overrides
    if payload.node_id not in app_state.weather_overrides:
        app_state.weather_overrides[payload.node_id] = {}

    for param in payload.parameters:
        actual_param = param.parameter
        # Map aliased temperature fields to the real attribute
        if actual_param in ("temperature_heat_c", "temperature_cold_c"):
            actual_param = "temperature_c"
        app_state.weather_overrides[payload.node_id][actual_param] = param.value

    # 3. Build eval_results with overrides applied non-destructively
    if app_state.weather_feed is None:
        raise HTTPException(status_code=503, detail="Weather feed not initialised yet")

    eval_results = app_state.weather_feed.results.copy()
    for nid, overrides in app_state.weather_overrides.items():
        if nid in eval_results:
            nw_copy = copy.copy(eval_results[nid])
            for p_name, p_val in overrides.items():
                if hasattr(nw_copy, p_name):
                    setattr(nw_copy, p_name, p_val)
            eval_results[nid] = nw_copy

    # 4. Run anomaly detection
    if app_state.detector is None:
        raise HTTPException(status_code=503, detail="Anomaly detector not initialised yet")

    alerts = app_state.detector.evaluate(eval_results)

    # Filter alerts relevant to this company
    if user.get("role") != "platform_admin":
        company_shipments = [
            s for s in app_state.scg.shipments if s.get("company_id") == company_id
        ]
        company_nodes: set[str] = set()
        for s in company_shipments:
            company_nodes.update(s.get("planned_route", []))
        # Always include the simulated node even if no shipments route through it yet
        company_nodes.add(payload.node_id)
        company_alerts = [
            a for a in alerts
            if a.node_id in company_nodes or a.node_id == payload.node_id
        ]
    else:
        company_alerts = alerts

    # 5. Compute analytics
    from backend.graph.cascade_model import compute_node_risk_scores, calculate_cascade_debt

    risk_scores = compute_node_risk_scores(app_state.scg, company_alerts)
    cascade_debt = calculate_cascade_debt(app_state.scg, risk_scores)

    # 6. Clear cached state so agents re-evaluate fresh
    app_state.agent_orchestrator.clear_reroutes()

    # 7. Run agent pipeline
    agent_logs, reroutes, stats = await app_state.agent_orchestrator.process_anomalies(
        company_alerts,
        app_state.scg,
        risk_scores=risk_scores,
        cascade_debt=cascade_debt,
    )

    # 8. Find pending approvals just created for this company
    pending_docs = await db.reroute_approvals.find(
        {"company_id": company_id, "status": "pending"}
    ).to_list(length=None)
    pending_ids = [p["id"] for p in pending_docs]

    # 9. Determine highest severity and total delay for the simulated node
    severity = "NONE"
    total_delay = 0.0
    node_name = payload.node_id
    sev_order = {"NONE": 0, "LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}

    for a in company_alerts:
        if a.node_id == payload.node_id:
            node_name = a.node_name
            total_delay += a.estimated_delay_hrs
            if sev_order.get(a.severity.value, 0) > sev_order.get(severity, 0):
                severity = a.severity.value

    # 10. Save simulation record
    simulation_id = str(uuid.uuid4())
    sim_record = {
        "id": simulation_id,
        "company_id": company_id,
        "node_id": payload.node_id,
        "node_name": node_name,
        "scenario_name": payload.scenario_name,
        "parameters": [p.dict() for p in payload.parameters],
        "alerts_generated": [
            {
                "node_id": a.node_id,
                "node_name": a.node_name,
                "severity": a.severity.value,
                "reasons": a.reasons,
                "estimated_delay_hrs": a.estimated_delay_hrs,
            }
            for a in company_alerts
        ],
        "agent_logs": agent_logs,
        "reroutes_suggested": stats["rerouted"],
        "blocked_count": stats["blocked"],
        "optimal_count": stats["optimal"],
        "pending_approval_ids": pending_ids,
        "severity": severity,
        "estimated_total_delay_hrs": total_delay,
        "triggered_by": user.get("user_id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.simulations.insert_one(sim_record)

    # 11. Broadcast update to company clients
    from backend.state import build_company_payload, broadcast_to_company

    c_msg = build_company_payload(
        company_id=company_id,
        agent_logs=agent_logs,
        risk_scores=risk_scores,
        cascade_debt=cascade_debt,
    )
    await broadcast_to_company(json.loads(c_msg), company_id)

    return {
        "simulation_id": simulation_id,
        "node_id": payload.node_id,
        "node_name": node_name,
        "scenario_name": payload.scenario_name,
        "alerts_generated": sim_record["alerts_generated"],
        "agent_logs": agent_logs,
        "reroutes_suggested": stats["rerouted"],
        "blocked_count": stats["blocked"],
        "optimal_count": stats["optimal"],
        "pending_approval_ids": pending_ids,
        "severity": severity,
        "estimated_total_delay_hrs": total_delay,
        "created_at": sim_record["created_at"],
    }


@router.get("/history")
async def get_simulation_history(
    limit: int = 20,
    user: dict = Depends(require_role("company_owner", "logistics_manager", "platform_admin")),
    db=Depends(get_async_db),
):
    """Returns past simulations for this company, newest first."""
    query: dict = {}
    if user.get("role") != "platform_admin":
        query["company_id"] = user.get("company_id")

    sims = (
        await db.simulations.find(query).sort("created_at", -1).to_list(length=limit)
    )
    return clean_list(sims)


@router.delete("/clear/{node_id}")
async def clear_node_simulation(
    node_id: str,
    user: dict = Depends(require_role("company_owner", "logistics_manager", "platform_admin")),
    db=Depends(get_async_db),
):
    """Clears weather overrides for a specific node and resets agent cache."""
    if node_id in app_state.weather_overrides:
        del app_state.weather_overrides[node_id]

    app_state.agent_orchestrator.clear_reroutes()
    return {"status": "cleared", "node_id": node_id}


@router.post("/manual-disruption")
async def create_manual_disruption(
    payload: ManualDisruptionPayload,
    user: dict = Depends(require_role("company_owner", "logistics_manager", "platform_admin")),
    db=Depends(get_async_db),
):
    """
    Creates a manual (non-weather) disruption record for a shipment.
    Updates the shipment status to 'delayed' in MongoDB and broadcasts.
    Logs to decision_logs for audit trail.
    """
    company_id = user.get("company_id")

    # Verify shipment exists
    shipment = await db.shipments.find_one({"id": payload.shipment_id})
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    # Company isolation
    if user.get("role") != "platform_admin" and shipment.get("company_id") != company_id:
        raise HTTPException(status_code=403, detail="Access denied")

    now = datetime.now(timezone.utc).isoformat()

    disruption_entry = {
        "type": payload.disruption_type,
        "delay_hrs": payload.delay_hrs,
        "description": payload.reason,
        "notes": payload.notes,
        "reported_by": user.get("user_id"),
        "reported_at": now,
    }

    # Update shipment status and push disruption record
    await db.shipments.update_one(
        {"id": payload.shipment_id},
        {
            "$set": {"status": "delayed"},
            "$push": {"disruptions": disruption_entry},
        },
    )

    # Log to decision_logs for audit trail
    await db.decision_logs.insert_one({
        "shipment_id": payload.shipment_id,
        "action_type": "MANUAL_DISRUPTION_REPORTED",
        "reasoning": (
            f"[{payload.disruption_type.upper()}] {payload.reason}"
            f" | Delay: +{payload.delay_hrs}h"
        ),
        "performed_by": user.get("user_id"),
        "company_id": company_id,
        "timestamp": now,
    })

    # Refresh in-memory graph and broadcast
    app_state.scg.refresh_from_db()
    from backend.state import build_company_payload, broadcast_to_company

    c_msg = build_company_payload(company_id=company_id)
    await broadcast_to_company(json.loads(c_msg), company_id)

    return {
        "status": "success",
        "shipment_id": payload.shipment_id,
        "disruption": disruption_entry,
    }
