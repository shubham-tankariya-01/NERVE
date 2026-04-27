"""
scout.py
The Scout agent validates raw anomalies.

LLM-enhanced: uses Groq to reason about which weather alerts
truly threaten logistics operations, considering context that
simple threshold comparisons miss (e.g., coastal vs inland impact,
compound weather events, time-of-day effects).

Falls back to heuristic if LLM is unavailable.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from backend.ml.anomaly import DisruptionAlert, Severity
from backend.agents.llm_config import get_llm

log = logging.getLogger("nerve.scout")


class ScoutAgent:
    def __init__(self):
        pass

    def inspect(self, alerts: list[DisruptionAlert]) -> tuple[list[DisruptionAlert], list[dict[str, str]]]:
        """
        Filters raw alerts and decides which ones warrant an active rerouting response.
        Returns the actionable alerts and an agent log.
        """
        actionable = []
        logs = []
        
        for a in alerts:
            # Scout decides only HIGH or CRITICAL alerts threaten the network heavily enough to reroute
            if a.severity in [Severity.HIGH, Severity.CRITICAL]:
                actionable.append(a)
                logs.append({
                    "agent": "Scout",
                    "action": f"Verified {a.severity.value} disruption at {a.node_name} (+{a.estimated_delay_hrs}h delay). Escalating to Mapper."
                })
                
        return actionable, logs

    def inspect_llm(self, alerts: list[DisruptionAlert]) -> tuple[list[DisruptionAlert], list[dict[str, str]]]:
        """
        LLM-powered alert triage. The LLM reasons about which alerts
        genuinely threaten logistics operations beyond simple severity thresholds.

        Falls back to heuristic inspect() on failure.
        """
        if not alerts:
            return [], []

        llm = get_llm()
        if llm is None:
            log.warning("LLM unavailable, falling back to heuristic Scout.")
            return self.inspect(alerts)

        # Build structured context for the LLM
        alerts_context = []
        for i, a in enumerate(alerts):
            alerts_context.append({
                "index": i,
                "node_id": a.node_id,
                "node_name": a.node_name,
                "severity": a.severity.value,
                "reasons": a.reasons,
                "estimated_delay_hrs": a.estimated_delay_hrs,
                "wind_speed_kmh": a.weather.wind_speed_kmh,
                "wind_gusts_kmh": a.weather.wind_gusts_kmh,
                "precipitation_mm": a.weather.precipitation_mm,
                "temperature_c": a.weather.temperature_c,
                "weather_condition": a.weather.weather_label,
            })

        prompt = f"""You are the Scout Agent in a global supply chain monitoring system.
Your job is to analyze weather disruption alerts and decide which ones genuinely threaten logistics operations enough to warrant rerouting shipments.

Consider:
- A port with 60km/h winds is dangerous for shipping but a warehouse inland may handle it fine
- Compound events (high wind + heavy rain) are far worse than either alone
- Temperature extremes affect different cargo types differently
- Even MEDIUM severity alerts might be dangerous if conditions are worsening
- HIGH/CRITICAL alerts are almost always actionable but verify the reasoning

Here are the current alerts:
{json.dumps(alerts_context, indent=2)}

Respond with ONLY valid JSON (no markdown, no explanation outside the JSON):
{{
    "actionable_indices": [list of indices from the alerts that should trigger rerouting],
    "reasoning": "brief explanation of your triage decisions"
}}"""

        try:
            response = llm.invoke(prompt)
            content = response.content.strip()

            # Handle potential markdown wrapping
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()

            result = json.loads(content)
            actionable_indices = result.get("actionable_indices", [])
            reasoning = result.get("reasoning", "")

            actionable = []
            logs = []

            for idx in actionable_indices:
                if 0 <= idx < len(alerts):
                    a = alerts[idx]
                    actionable.append(a)

            if actionable:
                logs.append({
                    "agent": "Scout",
                    "action": f"[AI] Analyzed {len(alerts)} alert(s), {len(actionable)} require action. {reasoning}"
                })
            else:
                logs.append({
                    "agent": "Scout",
                    "action": f"[AI] Analyzed {len(alerts)} alert(s). None require rerouting. {reasoning}"
                })

            log.info("Scout LLM triage: %d/%d alerts actionable", len(actionable), len(alerts))
            return actionable, logs

        except Exception as e:
            log.error("Scout LLM failed: %s — falling back to heuristic", e)
            return self.inspect(alerts)
