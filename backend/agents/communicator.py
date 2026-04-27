"""
communicator.py
Translates complex routing decisions into human-readable insights
per Section 7.4 of the detailed ideation.

LLM-enhanced: uses Groq to generate natural-language justifications
that logistics managers can actually understand, explaining *why*
a specific route was chosen over alternatives and what risks
were mitigated.

Falls back to template-based communication if LLM is unavailable.
"""

from __future__ import annotations

import json
import logging

from backend.ml.anomaly import DisruptionAlert
from backend.agents.llm_config import get_llm

log = logging.getLogger("nerve.communicator")


class CommunicatorAgent:
    def __init__(self):
        pass

    def communicate(
        self,
        reroutes: dict[str, list[str]],
        shipments: list[dict],
        actionable_alerts: list[DisruptionAlert],
    ) -> list[dict[str, str]]:
        """
        Draft context-rich messages for each rerouted shipment.
        """
        logs: list[dict[str, str]] = []

        # Build a quick lookup of shipment details
        ship_lookup: dict[str, dict] = {}
        for s in shipments:
            ship_lookup[s["id"]] = s

        # Build alert summaries keyed by node
        alert_reasons: dict[str, str] = {}
        alert_delays: dict[str, float] = {}
        for a in actionable_alerts:
            alert_reasons[a.node_id] = "; ".join(a.reasons)
            alert_delays[a.node_id] = a.estimated_delay_hrs

        for s_id, new_route in reroutes.items():
            ship = ship_lookup.get(s_id, {})
            priority = ship.get("priority", "unknown").upper()
            route_str = " → ".join(new_route)

            # Find which disrupted node this shipment was avoiding
            planned = ship.get("planned_route", [])
            avoided_node = None
            avoided_reason = ""
            avoided_delay = 0.0
            for node_id in planned:
                if node_id in alert_reasons:
                    avoided_node = node_id
                    avoided_reason = alert_reasons[node_id]
                    avoided_delay = alert_delays.get(node_id, 0)
                    break

            if avoided_node and avoided_reason:
                msg = (
                    f"[REROUTED] {s_id} (Priority: {priority}) — "
                    f"Disruption at {avoided_node}: {avoided_reason}. "
                    f"Avoiding est. +{avoided_delay:.0f}h delay. "
                    f"New path: {route_str}."
                )
            else:
                msg = (
                    f"[REROUTED] {s_id} (Priority: {priority}) — "
                    f"New optimal path: {route_str}."
                )

            logs.append({"agent": "Communicator", "action": msg})

        return logs

    def communicate_llm(
        self,
        reroutes: dict[str, list[str]],
        shipments: list[dict],
        actionable_alerts: list[DisruptionAlert],
        optimizer_reasoning: dict[str, str] | None = None,
    ) -> list[dict[str, str]]:
        """
        LLM-powered communication. Generates natural-language
        justifications that explain *why* routes were changed
        in terms a logistics manager would understand.

        Falls back to template communicate() on failure.
        """
        if not reroutes:
            return []

        llm = get_llm()
        if llm is None:
            log.warning("LLM unavailable, falling back to template Communicator.")
            return self.communicate(reroutes, shipments, actionable_alerts)

        if optimizer_reasoning is None:
            optimizer_reasoning = {}

        # Build context
        ship_lookup = {s["id"]: s for s in shipments}
        alert_ctx = {}
        for a in actionable_alerts:
            alert_ctx[a.node_id] = {
                "node_name": a.node_name,
                "severity": a.severity.value,
                "reasons": a.reasons,
                "delay_hrs": a.estimated_delay_hrs,
            }

        reroute_summaries = []
        for s_id, new_route in reroutes.items():
            ship = ship_lookup.get(s_id, {})
            old_route = ship.get("planned_route", [])

            # Find avoided nodes
            avoided = [n for n in old_route if n in alert_ctx]
            avoided_details = [
                {"node": n, **alert_ctx[n]} for n in avoided
            ]

            reroute_summaries.append({
                "shipment_id": s_id,
                "priority": ship.get("priority", "medium"),
                "cargo_type": ship.get("cargo_type", "general"),
                "origin": ship.get("origin", "unknown"),
                "destination": ship.get("destination", "unknown"),
                "old_route": old_route,
                "new_route": new_route,
                "avoided_disruptions": avoided_details,
                "optimizer_reasoning": optimizer_reasoning.get(s_id, ""),
            })

        prompt = f"""You are the Communicator Agent in a supply chain monitoring system.
Your audience is logistics managers who need clear, concise explanations.

The following shipments have been rerouted by the AI optimizer:
{json.dumps(reroute_summaries, indent=2)}

For EACH rerouted shipment, write a concise one-line status message (max 200 chars).
The message should explain:
1. What disruption was avoided
2. What the trade-off is (if any)
3. The key benefit of the new route

Respond with ONLY valid JSON:
{{
    "messages": [
        {{"shipment_id": "S001", "message": "your concise reroute explanation"}}
    ]
}}"""

        try:
            response = llm.invoke(prompt)
            content = response.content.strip()

            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()

            result = json.loads(content)
            messages = result.get("messages", [])

            logs = []
            for msg_data in messages:
                s_id = msg_data.get("shipment_id", "???")
                message = msg_data.get("message", "Rerouted.")
                ship = ship_lookup.get(s_id, {})
                priority = ship.get("priority", "unknown").upper()

                logs.append({
                    "agent": "Communicator",
                    "action": f"[AI] {s_id} (Priority: {priority}) — {message}"
                })

            # If LLM missed any shipments, add template fallback for those
            covered_ids = {m.get("shipment_id") for m in messages}
            for s_id in reroutes:
                if s_id not in covered_ids:
                    route_str = " → ".join(reroutes[s_id])
                    logs.append({
                        "agent": "Communicator",
                        "action": f"[REROUTED] {s_id} — New path: {route_str}."
                    })

            log.info("Communicator LLM: generated %d messages", len(logs))
            return logs

        except Exception as e:
            log.error("Communicator LLM failed: %s — falling back to template", e)
            return self.communicate(reroutes, shipments, actionable_alerts)
