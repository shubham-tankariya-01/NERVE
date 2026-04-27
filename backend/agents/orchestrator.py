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
from datetime import datetime, timezone

from backend.ml.anomaly import DisruptionAlert
from backend.graph.supply_graph import SupplyChainGraph

from backend.agents.llm_graph import get_agent_graph
from backend.agents.llm_config import is_llm_available

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

    def process_anomalies(
        self,
        alerts: list[DisruptionAlert],
        scg: SupplyChainGraph,
        risk_scores: dict[str, float] | None = None,
        cascade_debt: list[dict] | None = None,
    ) -> tuple[list[dict], dict]:
        """
        Run the full agent pipeline via LangGraph.

        Returns (agent_event_logs, reroutes_dict).
        """
        global_logs: list[dict] = []

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
                    if self.processed_shipments[s_id]["result"] == "rerouted":
                        global_logs.append({
                            "agent": "Monitor",
                            "action": (
                                f"New disruption detected on rerouted path for {s_id}. "
                                f"Re-evaluating."
                            ),
                            "timestamp": ts,
                        })
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

            # Update processed_shipments from the graph run
            if "processed_shipments" in final_state:
                self.processed_shipments.update(final_state["processed_shipments"])

            # Timestamp all logs
            stamp_logs(agent_logs)
            global_logs.extend(agent_logs)

        except Exception as e:
            log.error("LangGraph pipeline failed: %s — running heuristic fallback", e)
            return self._fallback_process(alerts, scg, risk_scores, cascade_debt)

        # ── Apply reroutes to in-memory shipment state & record history ──
        if reroutes:
            disrupted_node_ids = {a.node_id for a in alerts}
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

                        # Record in persistent history
                        avoided = [n for n in old_route if n in disrupted_node_ids]
                        reasons = []
                        for a in alerts:
                            if a.node_id in avoided:
                                reasons.append(f"{a.node_name}: {'; '.join(a.reasons)}")
                        self.reroute_history.append({
                            "shipment_id": s_id,
                            "old_route": old_route,
                            "new_route": list(ship["planned_route"]),
                            "avoided_nodes": avoided,
                            "reason": "; ".join(reasons) if reasons else "AI-optimized route selection",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        })

        # ── Persistent reroute history log ────────────────────────
        # Always show active reroutes so they survive refresh cycles
        ts = datetime.now(timezone.utc).isoformat()
        active_rerouted = [
            sid for sid, info in self.processed_shipments.items()
            if info["result"] == "rerouted"
        ]
        if active_rerouted:
            # Build route summaries
            reroute_details = []
            for sid in active_rerouted:
                route = self.processed_shipments[sid].get("route", [])
                path_str = " → ".join(route) if route else "unknown"
                reroute_details.append(f"{sid} ({path_str})")
            global_logs.append({
                "agent": "Reroute Log",
                "action": f"Active reroutes ({len(active_rerouted)}): {'; '.join(reroute_details)}",
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

    def _fallback_process(
        self,
        alerts: list[DisruptionAlert],
        scg: SupplyChainGraph,
        risk_scores: dict[str, float] | None = None,
        cascade_debt: list[dict] | None = None,
    ) -> tuple[list[dict], dict]:
        """
        Heuristic fallback pipeline — used when LangGraph fails.
        Uses the original heuristic methods on each agent.
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
            "action": "LLM pipeline unavailable — running heuristic agents.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

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
