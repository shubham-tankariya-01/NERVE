"""
mapper.py
The Mapper agent identifies shipments affected by a disruption.

LLM-enhanced: uses Groq to analyze which shipments are at risk
and rank them by urgency, considering factors like priority,
cargo type, proximity to disrupted nodes, and alternative options.

Falls back to heuristic if LLM is unavailable.
"""

from __future__ import annotations

import json
import logging

from backend.ml.anomaly import DisruptionAlert
from backend.agents.llm_config import get_llm

log = logging.getLogger("nerve.mapper")


class MapperAgent:
    def __init__(self):
        pass

    def map_impact(self, actionable_alerts: list[DisruptionAlert], shipments: list[dict]) -> tuple[dict[str, list[dict]], list[dict[str, str]]]:
        """
        Finds all shipments that are headed towards (or currently at) disrupted nodes.
        Returns a mapping of {alert_node_id: [impacted_shipments]} and an agent log.
        """
        impacts = {}
        logs = []

        for alert in actionable_alerts:
            disrupted_node = alert.node_id
            affected_ships = []
            skipped_delivered = 0
            skipped_not_on_path = 0
            
            for ship in shipments:
                if ship["status"] == "delivered":
                    skipped_delivered += 1
                    continue
                    
                planned = ship.get("planned_route", [])
                
                # Check if the disrupted node is in their future path
                try:
                    curr_idx = planned.index(ship["current_node"])
                except ValueError:
                    # fallback if current_node isn't in planned
                    curr_idx = len(ship.get("route_taken", [])) - 1
                
                # Only care if the disruption is ahead of us or right here
                if disrupted_node in planned[curr_idx:]:
                    # --- SUPPRESS DUPLICATES ---
                    reviewed = ship.get("reviewed_disruptions", [])
                    if disrupted_node in reviewed:
                        last_approved = ship.get("last_approved_route")
                        if last_approved == planned:
                            continue
                    # ---------------------------
                    affected_ships.append(ship)
                else:
                    skipped_not_on_path += 1
                    
            if affected_ships:
                impacts[disrupted_node] = affected_ships
                ship_ids = [s["id"] for s in affected_ships]
                
                at_node = [s["id"] for s in affected_ships if s["current_node"] == disrupted_node]
                approaching = [s["id"] for s in affected_ships if s["current_node"] != disrupted_node]
                
                logs.append({
                    "agent": "Mapper",
                    "action": (
                        f"Detected {len(affected_ships)} shipment(s) impacted by {disrupted_node}. "
                        f"{len(at_node)} currently at node, {len(approaching)} approaching. "
                        f"Skipped: {skipped_delivered} delivered, {skipped_not_on_path} unaffected."
                    )
                })
            else:
                logs.append({
                    "agent": "Mapper",
                    "action": (
                        f"No active shipments are routed through {disrupted_node}. "
                        f"Analysis complete (Skipped {skipped_delivered} delivered, {skipped_not_on_path} unaffected)."
                    )
                })

        return impacts, logs

    def map_impact_llm(
        self,
        actionable_alerts: list[DisruptionAlert],
        shipments: list[dict],
    ) -> tuple[dict[str, list[dict]], list[dict[str, str]]]:
        """
        LLM-powered impact mapping. First runs heuristic to find
        structurally impacted shipments, then asks the LLM to
        rank them by urgency and provide context.

        Falls back to heuristic map_impact() on failure.
        """
        # Always run heuristic first — we need the structural mapping
        impacts, base_logs = self.map_impact(actionable_alerts, shipments)

        if not impacts:
            return impacts, base_logs

        llm = get_llm()
        if llm is None:
            log.warning("LLM unavailable, using heuristic Mapper results.")
            return impacts, base_logs

        # Build context for the LLM
        disruption_ctx = []
        for a in actionable_alerts:
            disruption_ctx.append({
                "node_id": a.node_id,
                "node_name": a.node_name,
                "severity": a.severity.value,
                "reasons": a.reasons,
                "estimated_delay_hrs": a.estimated_delay_hrs,
            })

        shipment_ctx = []
        for node_id, ships in impacts.items():
            for s in ships:
                planned = s.get("planned_route", [])
                try:
                    curr_idx = planned.index(s["current_node"])
                    remaining_hops = len(planned) - curr_idx - 1
                except ValueError:
                    remaining_hops = len(planned)

                shipment_ctx.append({
                    "id": s["id"],
                    "priority": s.get("priority", "medium"),
                    "cargo_type": s.get("cargo_type", "unknown"),
                    "current_node": s["current_node"],
                    "destination": s["destination"],
                    "disrupted_node": node_id,
                    "remaining_hops": remaining_hops,
                    "status": s.get("status", "unknown"),
                })

        prompt = f"""You are the Mapper Agent in a global supply chain monitoring system.
The Scout has identified these active disruptions:
{json.dumps(disruption_ctx, indent=2)}

These shipments are structurally impacted (their routes pass through disrupted nodes):
{json.dumps(shipment_ctx, indent=2)}

Analyze the impact and rank shipments by urgency. Consider:
- Critical/high priority shipments need immediate rerouting
- Shipments closer to the disrupted node (fewer remaining hops) are more urgent
- Cargo type matters (perishable goods can't afford delays)
- Multiple disruptions on a single shipment's path compounds risk

Respond with ONLY valid JSON:
{{
    "urgency_ranking": [
        {{"shipment_id": "S001", "urgency": "critical|high|medium|low", "reason": "brief reason"}}
    ],
    "summary": "brief overall impact assessment"
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
            summary = result.get("summary", "")
            rankings = result.get("urgency_ranking", [])

            logs = []
            # Format the LLM's analysis into agent logs
            if rankings:
                critical_count = sum(1 for r in rankings if r.get("urgency") in ["critical", "high"])
                logs.append({
                    "agent": "Mapper",
                    "action": f"[AI] Impact analysis: {len(rankings)} shipment(s) affected, {critical_count} urgent. {summary}"
                })

                # Add individual urgency notes for high-priority ones
                for r in rankings:
                    if r.get("urgency") in ["critical", "high"]:
                        logs.append({
                            "agent": "Mapper",
                            "action": f"[AI] {r['shipment_id']} — urgency: {r['urgency'].upper()}. {r.get('reason', '')}"
                        })

            log.info("Mapper LLM analysis: %d shipments ranked", len(rankings))
            return impacts, logs

        except Exception as e:
            log.error("Mapper LLM failed: %s — falling back to heuristic", e)
            return impacts, base_logs
