"""
orchestrator.py
Coordinates the multi-agent workflow via a LangGraph StateGraph.

The pipeline (Scout → Mapper → Optimizer → Communicator) is now driven
by LLM-powered agents through LangGraph. Each agent uses Groq's
llama-3.3-70b-versatile for contextual reasoning, with automatic
fallback to heuristic algorithms if the LLM is unavailable.

Tracks ALL shipments evaluated by the Optimizer (rerouted, optimal, blocked)
so that subsequent scan cycles don't redundantly re-evaluate them while the
same disruption landscape is active.
"""

from __future__ import annotations

import logging
import json
from datetime import datetime, timezone, timedelta
import uuid

from backend.ml.anomaly import DisruptionAlert
from backend.graph.supply_graph import SupplyChainGraph

from backend.agents.llm_graph import get_agent_graph
from backend.agents.llm_config import is_llm_available
from backend.database import get_async_db

log = logging.getLogger("nerve.orchestrator")


class AgentOrchestrator:
    def __init__(self):
        # Cache of ALL shipments evaluated by the optimizer.
        # {shipment_id: {"result": "rerouted"|"optimal"|"blocked", "route": [...] or None}}
        self.processed_shipments: dict[str, dict] = {}

        # The disrupted node set that was active when shipments were last processed.
        # When this changes, stale cache entries are invalidated.
        self._last_disrupted_nodes: frozenset[str] = frozenset()

        # Persistent reroute history — survives cache clears.
        # [{shipment_id, old_route, new_route, avoided_nodes, reason, timestamp}]
        self.reroute_history: list[dict] = []

    def clear_reroutes(self) -> None:
        """Clear all tracked state (e.g. when disruptions are manually cleared)."""
        self.processed_shipments.clear()
        self._last_disrupted_nodes = frozenset()

    async def process_anomalies(
        self,
        alerts: list[DisruptionAlert],
        scg: SupplyChainGraph,
        risk_scores: dict[str, float] | None = None,
        cascade_debt: list[dict] | None = None,
        company_id: str = "company_demo",
    ) -> tuple[list[dict], dict]:
        """
        Run the full agent pipeline via LangGraph.
        Saves suggestions for human approval instead of auto-applying.

        Returns (agent_event_logs, reroutes_dict).
        """
        global_logs: list[dict] = []
        db = get_async_db()

        def stamp_logs(log_batch: list[dict]) -> None:
            ts = datetime.now(timezone.utc).isoformat()
            for entry in log_batch:
                entry["timestamp"] = ts

        # ── Handle "no alerts" or "disruption landscape cleared" ──
        if not alerts:
            if self.processed_shipments:
                rerouted_ids = [
                    sid for sid, info in self.processed_shipments.items()
                    if info["result"] == "rerouted"
                ]
                ts = datetime.now(timezone.utc).isoformat()
                if rerouted_ids:
                    for s_id in rerouted_ids:
                        global_logs.append({
                            "agent": "Monitor",
                            "action": f"All disruptions resolved. Releasing reroute lock on {s_id}.",
                            "timestamp": ts,
                        })
                self.processed_shipments.clear()
                self._last_disrupted_nodes = frozenset()
            return global_logs, {}

        # ── Detect disruption landscape changes ──────────────────
        current_disrupted = frozenset(a.node_id for a in alerts)

        if current_disrupted != self._last_disrupted_nodes:
            if self._last_disrupted_nodes:
                new_disruptions = current_disrupted - self._last_disrupted_nodes
                to_remove: list[str] = []

                for s_id, info in self.processed_shipments.items():
                    if info["result"] == "rerouted":
                        route = info.get("route", [])
                        if any(n in new_disruptions for n in route):
                            to_remove.append(s_id)
                    else:
                        to_remove.append(s_id)

                ts = datetime.now(timezone.utc).isoformat()
                for s_id in to_remove:
                    if s_id in self.processed_shipments and self.processed_shipments[s_id]["result"] == "rerouted":
                        global_logs.append({
                            "agent": "Monitor",
                            "action": (
                                f"New disruption detected on rerouted path for {s_id}. "
                                f"Re-evaluating."
                            ),
                            "timestamp": ts,
                        })
                    if s_id in self.processed_shipments:
                        del self.processed_shipments[s_id]

            self._last_disrupted_nodes = current_disrupted

        # ── Run the LangGraph agent pipeline ─────────────────────
        try:
            agent_graph = get_agent_graph()

            initial_state = {
                "alerts": alerts,
                "scg": scg,
                "risk_scores": risk_scores or {},
                "cascade_debt": cascade_debt or [],
                "processed_shipments": self.processed_shipments,
                "actionable_alerts": [],
                "impacts": {},
                "reroutes": {},
                "optimizer_reasoning": {},
                "agent_logs": [],
            }

            final_state = agent_graph.invoke(initial_state)

            agent_logs = final_state.get("agent_logs", [])
            reroutes = final_state.get("reroutes", {})
            reasoning = final_state.get("optimizer_reasoning", {})
            actionable_alerts = final_state.get("actionable_alerts", [])

            # Update processed_shipments from the graph run
            if "processed_shipments" in final_state:
                self.processed_shipments.update(final_state["processed_shipments"])

            # Timestamp all logs
            stamp_logs(agent_logs)
            global_logs.extend(agent_logs)

        except Exception as e:
            log.error("LangGraph pipeline failed: %s — running heuristic fallback", e)
            return self._fallback_process(alerts, scg, risk_scores, cascade_debt)

        # ── SAVE reroute suggestions for human approval ────────────────
        if reroutes:
            await self._save_reroute_suggestions(
                reroutes, actionable_alerts, reasoning, company_id, scg
            )

        # ── Persistent reroute history log ────────────────────────
        # Shows APPROVED reroutes from DB
        ts = datetime.now(timezone.utc).isoformat()
        approved = await db.reroute_approvals.find({
            "company_id": company_id,
            "status": "approved"
        }).to_list(length=None)
        
        if approved:
            reroute_details = [f"{a['shipment_id']} ({' → '.join(a['suggested_route'])})" for a in approved]
            global_logs.append({
                "agent": "Reroute Log",
                "action": f"Approved reroutes ({len(approved)}): {'; '.join(reroute_details)}",
                "timestamp": ts,
            })

        # ── Persistent blocked shipments log ──────────────────────
        active_blocked = [
            sid for sid, info in self.processed_shipments.items()
            if info["result"] == "blocked"
        ]
        if active_blocked:
            global_logs.append({
                "agent": "Reroute Log",
                "action": f"⚠ BLOCKED ({len(active_blocked)}): {', '.join(active_blocked)} — no viable route to destination. Manual intervention may be required.",
                "timestamp": ts,
            })

        return global_logs, reroutes

    async def _save_reroute_suggestions(
        self,
        reroutes: dict,
        alerts: list,
        reasoning: dict,
        company_id: str,
        scg: SupplyChainGraph
    ) -> None:
        """
        Saves agent reroute suggestions to MongoDB for human approval.
        Does NOT apply routes automatically.
        """
        from backend.database import get_async_db
        from backend.state import broadcast_to_company
        
        db = get_async_db()
        
        # Build alert lookup for context
        alert_lookup = {a.node_id: a for a in alerts}
        
        for s_id, new_path in reroutes.items():
            # Find original shipment
            original_route = []
            priority = "medium"
            for ship in scg.shipments:
                if ship["id"] == s_id:
                    original_route = ship.get("planned_route", [])
                    priority = ship.get("priority", "medium")
                    break
            
            # Find which disrupted node triggered this
            disrupted_node = ""
            estimated_delay = 0.0
            for node_id in original_route:
                if node_id in alert_lookup:
                    disrupted_node = node_id
                    estimated_delay = alert_lookup[node_id].estimated_delay_hrs
                    break
            
            # Check if suggestion already exists for this shipment (pending)
            existing = await db.reroute_approvals.find_one({
                "shipment_id": s_id,
                "status": "pending",
                "company_id": company_id
            })
            
            if existing:
                # Update existing suggestion if route changed
                if existing["suggested_route"] != new_path:
                    await db.reroute_approvals.update_one(
                        {"id": existing["id"]},
                        {"$set": {
                            "suggested_route": new_path,
                            "agent_reasoning": reasoning.get(s_id, ""),
                            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=30)
                        }}
                    )
                continue
            
            # Create new suggestion
            approval_id = str(uuid.uuid4())
            approval = {
                "id": approval_id,
                "company_id": company_id,
                "shipment_id": s_id,
                "suggested_route": new_path,
                "original_route": original_route,
                "agent_reasoning": reasoning.get(s_id, "Auto-generated by optimization agents"),
                "disrupted_node": disrupted_node,
                "estimated_delay_hrs": estimated_delay,
                "priority": priority,
                "status": "pending",
                "reviewed_by": None,
                "review_reason": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "reviewed_at": None,
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
            }
            
            await db.reroute_approvals.insert_one(approval)
            log.info("Reroute suggestion saved for %s (approval_id: %s)", s_id, approval_id)
        
        # Count pending approvals and broadcast notification
        pending_count = await db.reroute_approvals.count_documents({
            "company_id": company_id,
            "status": "pending"
        })
        
        # Broadcast pending count update via WebSocket
        notification = {
            "type": "reroute_approval_update",
            "pending_count": pending_count,
            "company_id": company_id
        }
        await broadcast_to_company(company_id, notification)

    def _fallback_process(
        self,
        alerts: list[DisruptionAlert],
        scg: SupplyChainGraph,
        risk_scores: dict[str, float] | None = None,
        cascade_debt: list[dict] | None = None,
    ) -> tuple[list[dict], dict]:
        """
        Heuristic fallback pipeline — used when LangGraph fails.
        Fallback mode: routes applied without approval queue (graceful degradation).
        """
        from backend.agents.scout import ScoutAgent
        from backend.agents.mapper import MapperAgent
        from backend.agents.optimizer import OptimizerAgent
        from backend.agents.communicator import CommunicatorAgent

        scout = ScoutAgent()
        mapper = MapperAgent()
        optimizer = OptimizerAgent()
        communicator = CommunicatorAgent()

        global_logs: list[dict] = []

        def append_logs(log_batch: list[dict]) -> None:
            ts = datetime.now(timezone.utc).isoformat()
            for entry in log_batch:
                entry["timestamp"] = ts
                global_logs.append(entry)

        global_logs.append({
            "agent": "System",
            "action": "LLM pipeline unavailable — running heuristic agents. Fallback mode: routes applied without approval queue.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        log.warning("Fallback mode: routes applied without approval queue")

        # 1. Scout
        actionable, s_logs = scout.inspect(alerts)
        if s_logs:
            append_logs(s_logs)
        if not actionable:
            return global_logs, {}

        # 2. Mapper
        impacts, m_logs = mapper.map_impact(actionable, scg.shipments)
        if m_logs:
            append_logs(m_logs)
        if not impacts:
            return global_logs, {}

        # 3. Optimizer
        reroutes, o_logs = optimizer.optimize(
            impacts, actionable, scg,
            risk_scores=risk_scores,
            cascade_debt=cascade_debt,
            processed_shipments=self.processed_shipments,
        )
        if o_logs:
            append_logs(o_logs)

        # 4. Communicator
        if reroutes:
            c_logs = communicator.communicate(reroutes, scg.shipments, actionable)
            if c_logs:
                append_logs(c_logs)

            # Apply reroutes
            disrupted_node_ids = {a.node_id for a in actionable}
            for s_id, new_path in reroutes.items():
                for ship in scg.shipments:
                    if ship["id"] == s_id:
                        old_route = list(ship["planned_route"])
                        curr = ship["current_node"]
                        try:
                            ci = ship["planned_route"].index(curr)
                            ship["planned_route"] = ship["planned_route"][:ci] + new_path
                        except ValueError:
                            ship["planned_route"] = new_path

                        avoided = [n for n in old_route if n in disrupted_node_ids]
                        reasons = []
                        for a in actionable:
                            if a.node_id in avoided:
                                reasons.append(f"{a.node_name}: {'; '.join(a.reasons)}")
                        self.reroute_history.append({
                            "shipment_id": s_id,
                            "old_route": old_route,
                            "new_route": list(ship["planned_route"]),
                            "avoided_nodes": avoided,
                            "reason": "; ".join(reasons) if reasons else "Route optimization",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        })

        return global_logs, reroutes
