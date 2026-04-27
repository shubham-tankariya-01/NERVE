"""
optimizer.py
The Optimizer agent computes alternate routes using a 4-factor
dynamic cost function per Section 7.3 of the detailed ideation:

    cost = w₁·time + w₂·monetary_cost + w₃·risk + w₄·cascade_impact

Weights are priority-aware (high-priority shipments pay more attention
to time and risk; low-priority shipments focus on monetary cost).

LLM-enhanced: Dijkstra still computes candidate routes (LLMs can't do
graph algorithms), but the LLM *selects* the best route from candidates
using contextual reasoning — considering factors the cost function can't
capture (e.g., consecutive risky nodes, port congestion patterns,
compound weather events along a path).

Supports evaluation caching: the orchestrator passes a mutable
processed_shipments dict.  Shipments already present are skipped
(no redundant graph computation), and newly evaluated shipments are
added to the dict so subsequent scan cycles skip them too.
"""

import json
import logging

import networkx as nx
from backend.graph.supply_graph import SupplyChainGraph
from backend.ml.anomaly import DisruptionAlert
from backend.agents.llm_config import get_llm

log = logging.getLogger("nerve.optimizer")


# Priority → weight vectors (time, cost, risk, cascade)
PRIORITY_WEIGHTS = {
    "critical": (0.55, 0.05, 0.25, 0.15),
    "high":     (0.50, 0.10, 0.25, 0.15),
    "medium":   (0.30, 0.30, 0.20, 0.20),
    "low":      (0.10, 0.50, 0.25, 0.15),
}

# Normalization constants (approximate domain maximums)
MAX_TIME = 120.0      # hours
MAX_COST = 2500.0     # $/unit
MAX_CASCADE = 60.0    # R0 score


class OptimizerAgent:
    def __init__(self):
        pass

    def _build_dynamic_cost_graph(
        self,
        scg: SupplyChainGraph,
        shipment: dict,
        alerts: list[DisruptionAlert],
        risk_scores: dict[str, float] | None = None,
        cascade_debt: list[dict] | None = None,
    ) -> nx.DiGraph:
        """
        Build a copy of the graph where each edge has a 'dynamic_weight'
        computed from the 4-factor cost function, tuned to the shipment's
        priority level.
        """
        if risk_scores is None:
            risk_scores = {}
        if cascade_debt is None:
            cascade_debt = []

        # Alert delay penalties: node_id → extra hours
        penalties: dict[str, float] = {}
        for a in alerts:
            penalties[a.node_id] = max(penalties.get(a.node_id, 0), a.estimated_delay_hrs)

        # Cascade debt lookup: node_id → score
        cascade_lookup: dict[str, float] = {}
        for entry in cascade_debt:
            cascade_lookup[entry["node_id"]] = entry["cascade_debt"]

        G = scg.graph.copy()

        priority = shipment.get("priority", "low").lower()
        w_time, w_cost, w_risk, w_cascade = PRIORITY_WEIGHTS.get(
            priority, PRIORITY_WEIGHTS["medium"]
        )

        for u, v, attrs in G.edges(data=True):
            base_time = attrs.get("base_transit_time_hrs", 10)
            base_cost = attrs.get("cost_per_unit", 100)

            # Time: base transit + any disruption delay at the destination
            effective_time = base_time + penalties.get(v, 0.0)

            # Risk: dynamic risk_score of the destination node
            dest_risk = risk_scores.get(v, 0.0)  # already ∈ [0, 1]

            # Cascade: structural fragility of the destination node
            dest_cascade = cascade_lookup.get(v, 0.0)

            # Normalize and compute composite weight
            norm_time = effective_time / MAX_TIME
            norm_cost = base_cost / MAX_COST
            norm_cascade = dest_cascade / MAX_CASCADE

            weight = (
                w_time * norm_time
                + w_cost * norm_cost
                + w_risk * dest_risk        # already [0, 1]
                + w_cascade * norm_cascade
                + 0.02                       # small hop penalty
            )

            G[u][v]["dynamic_weight"] = weight

        return G

    def optimize(
        self,
        impacts: dict[str, list[dict]],
        actionable_alerts: list[DisruptionAlert],
        scg: SupplyChainGraph,
        risk_scores: dict[str, float] | None = None,
        cascade_debt: list[dict] | None = None,
        processed_shipments: dict[str, dict] | None = None,
    ) -> tuple[dict, list[dict]]:
        """
        Calculate the best reroutes for impacted shipments using
        Yen's K-shortest paths on the dynamically weighted graph.

        processed_shipments is a mutable dict maintained by the orchestrator.
        Shipments already present are skipped; newly evaluated shipments are
        added in-place so future scan cycles skip them automatically.
        """
        if processed_shipments is None:
            processed_shipments = {}

        logs: list[dict] = []
        reroutes: dict[str, list[str]] = {}

        # Collect IDs for consolidated summary logs
        optimal_ids: list[str] = []
        blocked_ids: list[str] = []

        # Counters for the summary log of skipped shipments
        skipped_rerouted = 0
        skipped_optimal = 0
        skipped_blocked = 0

        # De-duplicate shipments across alerts
        unique_shipments: dict[str, dict] = {}
        for ship_list in impacts.values():
            for s in ship_list:
                unique_shipments[s["id"]] = s

        for s_id, shipment in unique_shipments.items():
            curr = shipment["current_node"]
            dest = shipment["destination"]

            if curr == dest:
                continue

            # ── Skip if already evaluated for this disruption set ──
            if s_id in processed_shipments:
                result = processed_shipments[s_id]["result"]
                if result == "rerouted":
                    skipped_rerouted += 1
                elif result == "optimal":
                    skipped_optimal += 1
                elif result == "blocked":
                    skipped_blocked += 1
                continue

            # ── Standard optimization ────────────────────────────
            dynamic_G = self._build_dynamic_cost_graph(
                scg, shipment, actionable_alerts, risk_scores, cascade_debt
            )

            try:
                paths_gen = nx.shortest_simple_paths(
                    dynamic_G, curr, dest, weight="dynamic_weight"
                )

                best_paths = []
                for idx, path in enumerate(paths_gen):
                    if idx >= 3:
                        break
                    best_paths.append(path)

                if not best_paths:
                    processed_shipments[s_id] = {"result": "blocked", "route": None}
                    blocked_ids.append(s_id)
                    continue

                best_route = best_paths[0]

                # Compare against current planned route from current node onward
                planned = shipment.get("planned_route", [])
                try:
                    ci = planned.index(curr)
                    orig_remaining = planned[ci:]
                except ValueError:
                    orig_remaining = []

                if best_route != orig_remaining:
                    reroutes[s_id] = best_route
                    processed_shipments[s_id] = {"result": "rerouted", "route": best_route}

                    # Compute original vs new cost for the communicator
                    orig_cost = self._path_cost(dynamic_G, orig_remaining) if len(orig_remaining) > 1 else None
                    new_cost = self._path_cost(dynamic_G, best_route)
                    savings_pct = ""
                    if orig_cost and orig_cost > 0:
                        savings_pct = f" ({round((1 - new_cost/orig_cost)*100)}% lower cost)"

                    logs.append({
                        "agent": "Optimizer",
                        "action": (
                            f"Rerouted {s_id} (Priority: {shipment['priority']}). "
                            f"New path: {len(best_route)} hops{savings_pct}."
                        ),
                    })
                else:
                    processed_shipments[s_id] = {"result": "optimal", "route": None}
                    optimal_ids.append(s_id)

            except nx.NetworkXNoPath:
                processed_shipments[s_id] = {"result": "blocked", "route": None}
                blocked_ids.append(s_id)
            except Exception as e:
                logs.append({
                    "agent": "Optimizer",
                    "action": f"Error calculating route for {s_id}: {e}",
                })

        # ── Consolidated summary logs ──
        if optimal_ids:
            logs.append({
                "agent": "Optimizer",
                "action": f"{', '.join(optimal_ids)} — routes remain optimal despite disruption.",
            })
        if blocked_ids:
            logs.append({
                "agent": "Optimizer",
                "action": f"⚠ BLOCKED: {', '.join(blocked_ids)} — no viable route to destination.",
            })

        # ── Summary log for skipped (already-evaluated) shipments ──
        skipped_total = skipped_rerouted + skipped_optimal + skipped_blocked
        if skipped_total > 0:
            parts = []
            if skipped_rerouted:
                parts.append(f"{skipped_rerouted} rerouted")
            if skipped_optimal:
                parts.append(f"{skipped_optimal} on optimal path")
            if skipped_blocked:
                parts.append(f"{skipped_blocked} blocked")
            logs.append({
                "agent": "Monitor",
                "action": (
                    f"{skipped_total} shipment(s) already evaluated — "
                    f"standing by ({', '.join(parts)})."
                ),
            })

        return reroutes, logs

    def optimize_llm(
        self,
        impacts: dict[str, list[dict]],
        actionable_alerts: list[DisruptionAlert],
        scg: SupplyChainGraph,
        risk_scores: dict[str, float] | None = None,
        cascade_debt: list[dict] | None = None,
        processed_shipments: dict[str, dict] | None = None,
    ) -> tuple[dict, list[dict], dict[str, str]]:
        """
        LLM-enhanced optimization. Dijkstra computes candidate routes,
        then the LLM selects the best one using contextual reasoning.

        Returns (reroutes, logs, optimizer_reasoning) where optimizer_reasoning
        is a dict mapping shipment_id → LLM's reasoning for the choice.

        Falls back to heuristic optimize() on failure.
        """
        if processed_shipments is None:
            processed_shipments = {}

        llm = get_llm()
        if llm is None:
            log.warning("LLM unavailable, falling back to heuristic Optimizer.")
            reroutes, logs = self.optimize(
                impacts, actionable_alerts, scg,
                risk_scores, cascade_debt, processed_shipments,
            )
            return reroutes, logs, {}

        logs: list[dict] = []
        reroutes: dict[str, list[str]] = {}
        optimizer_reasoning: dict[str, str] = {}

        # Collect IDs for consolidated summary logs
        optimal_ids: list[str] = []
        blocked_ids: list[str] = []

        # Counters for skipped
        skipped_rerouted = 0
        skipped_optimal = 0
        skipped_blocked = 0

        # De-duplicate shipments
        unique_shipments: dict[str, dict] = {}
        for ship_list in impacts.values():
            for s in ship_list:
                unique_shipments[s["id"]] = s

        # Disrupted nodes set
        disrupted_nodes = {a.node_id for a in actionable_alerts}

        # Collect all LLM decisions to make in batch
        llm_decisions_needed: list[dict] = []

        for s_id, shipment in unique_shipments.items():
            curr = shipment["current_node"]
            dest = shipment["destination"]

            if curr == dest:
                continue

            if s_id in processed_shipments:
                result = processed_shipments[s_id]["result"]
                if result == "rerouted":
                    skipped_rerouted += 1
                elif result == "optimal":
                    skipped_optimal += 1
                elif result == "blocked":
                    skipped_blocked += 1
                continue

            # Compute candidate routes via Dijkstra
            dynamic_G = self._build_dynamic_cost_graph(
                scg, shipment, actionable_alerts, risk_scores, cascade_debt
            )

            try:
                paths_gen = nx.shortest_simple_paths(
                    dynamic_G, curr, dest, weight="dynamic_weight"
                )

                candidates = []
                for idx, path in enumerate(paths_gen):
                    if idx >= 5:  # Get more candidates for LLM to evaluate
                        break

                    # Analyze each candidate
                    total_cost = self._path_cost(dynamic_G, path)
                    total_time = sum(
                        dynamic_G[path[i]][path[i+1]].get("base_transit_time_hrs", 0)
                        for i in range(len(path) - 1)
                        if dynamic_G.has_edge(path[i], path[i+1])
                    )
                    risky_nodes = [n for n in path if n in disrupted_nodes]
                    risk_on_path = sum(
                        risk_scores.get(n, 0) for n in path
                    ) / max(len(path), 1) if risk_scores else 0

                    candidates.append({
                        "index": idx,
                        "path": path,
                        "hops": len(path) - 1,
                        "composite_cost": round(total_cost, 4),
                        "transit_hours": round(total_time, 1),
                        "passes_through_disrupted": risky_nodes,
                        "avg_risk_score": round(risk_on_path, 3),
                    })

                if not candidates:
                    processed_shipments[s_id] = {"result": "blocked", "route": None}
                    blocked_ids.append(s_id)
                    continue

                # Check if best candidate differs from current route
                planned = shipment.get("planned_route", [])
                try:
                    ci = planned.index(curr)
                    orig_remaining = planned[ci:]
                except ValueError:
                    orig_remaining = []

                # If only one candidate and it matches, route is optimal
                if len(candidates) == 1 and candidates[0]["path"] == orig_remaining:
                    processed_shipments[s_id] = {"result": "optimal", "route": None}
                    optimal_ids.append(s_id)
                    continue

                llm_decisions_needed.append({
                    "shipment_id": s_id,
                    "shipment": shipment,
                    "candidates": candidates,
                    "orig_remaining": orig_remaining,
                    "dynamic_G": dynamic_G,
                })

            except nx.NetworkXNoPath:
                processed_shipments[s_id] = {"result": "blocked", "route": None}
                blocked_ids.append(s_id)
            except Exception as e:
                logs.append({
                    "agent": "Optimizer",
                    "action": f"Error calculating route for {s_id}: {e}",
                })

        # ── LLM route selection ──────────────────────────────────
        if llm_decisions_needed:
            # Build disruption context once
            disruption_ctx = []
            for a in actionable_alerts:
                disruption_ctx.append({
                    "node_id": a.node_id,
                    "node_name": a.node_name,
                    "severity": a.severity.value,
                    "reasons": a.reasons,
                    "delay_hrs": a.estimated_delay_hrs,
                })

            for decision in llm_decisions_needed:
                s_id = decision["shipment_id"]
                shipment = decision["shipment"]
                candidates = decision["candidates"]
                orig_remaining = decision["orig_remaining"]
                dynamic_G = decision["dynamic_G"]

                # Serialize candidates for LLM (strip internal objects)
                candidates_for_llm = []
                for c in candidates:
                    candidates_for_llm.append({
                        "index": c["index"],
                        "path": c["path"],
                        "hops": c["hops"],
                        "composite_cost": c["composite_cost"],
                        "transit_hours": c["transit_hours"],
                        "passes_through_disrupted": c["passes_through_disrupted"],
                        "avg_risk_score": c["avg_risk_score"],
                    })

                prompt = f"""You are the Optimizer Agent in a supply chain monitoring system.
You must select the best route for shipment {s_id}.

Shipment details:
- Priority: {shipment.get('priority', 'medium')}
- Cargo type: {shipment.get('cargo_type', 'general')}
- Current node: {shipment['current_node']}
- Destination: {shipment['destination']}
- Original remaining route: {orig_remaining}

Active disruptions:
{json.dumps(disruption_ctx, indent=2)}

Candidate routes (computed by Dijkstra algorithm):
{json.dumps(candidates_for_llm, indent=2)}

Consider these factors the cost function might miss:
- Routes through consecutive disrupted/risky nodes are worse than the sum of individual risks
- For critical priority: prioritize speed and safety over cost
- For low priority: cost savings matter more
- Fewer hops generally means fewer failure points
- A route that barely avoids a disrupted area might be affected by the same weather system

Select the best route. Respond with ONLY valid JSON:
{{
    "selected_index": <index of the best candidate>,
    "reasoning": "brief explanation of why this route is best"
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
                    selected_idx = result.get("selected_index", 0)
                    reasoning = result.get("reasoning", "")

                    # Validate index
                    if not (0 <= selected_idx < len(candidates)):
                        selected_idx = 0

                    selected = candidates[selected_idx]
                    best_route = selected["path"]

                    if best_route != orig_remaining:
                        reroutes[s_id] = best_route
                        processed_shipments[s_id] = {"result": "rerouted", "route": best_route}
                        optimizer_reasoning[s_id] = reasoning

                        orig_cost = self._path_cost(dynamic_G, orig_remaining) if len(orig_remaining) > 1 else None
                        new_cost = selected["composite_cost"]
                        savings_pct = ""
                        if orig_cost and orig_cost > 0:
                            savings_pct = f" ({round((1 - new_cost/orig_cost)*100)}% lower cost)"

                        logs.append({
                            "agent": "Optimizer",
                            "action": (
                                f"[AI] Rerouted {s_id} (Priority: {shipment['priority']}). "
                                f"Selected route {selected_idx + 1}/{len(candidates)}, "
                                f"{selected['hops']} hops{savings_pct}. {reasoning}"
                            ),
                        })
                    else:
                        processed_shipments[s_id] = {"result": "optimal", "route": None}
                        optimal_ids.append(s_id)

                    log.info("Optimizer LLM selected route %d/%d for %s",
                             selected_idx + 1, len(candidates), s_id)

                except Exception as e:
                    log.error("Optimizer LLM failed for %s: %s — using Dijkstra best", s_id, e)
                    # Fallback: use the first candidate (Dijkstra's best)
                    best_route = candidates[0]["path"]
                    if best_route != orig_remaining:
                        reroutes[s_id] = best_route
                        processed_shipments[s_id] = {"result": "rerouted", "route": best_route}
                        logs.append({
                            "agent": "Optimizer",
                            "action": (
                                f"Rerouted {s_id} (Priority: {shipment['priority']}). "
                                f"New path: {len(best_route)} hops (Dijkstra fallback)."
                            ),
                        })
                    else:
                        processed_shipments[s_id] = {"result": "optimal", "route": None}
                        optimal_ids.append(s_id)

        # ── Consolidated summary logs ──
        if optimal_ids:
            logs.append({
                "agent": "Optimizer",
                "action": f"{', '.join(optimal_ids)} — routes remain optimal despite disruption.",
            })
        if blocked_ids:
            logs.append({
                "agent": "Optimizer",
                "action": f"⚠ BLOCKED: {', '.join(blocked_ids)} — no viable route to destination.",
            })

        # ── Summary log for skipped shipments ──
        skipped_total = skipped_rerouted + skipped_optimal + skipped_blocked
        if skipped_total > 0:
            parts = []
            if skipped_rerouted:
                parts.append(f"{skipped_rerouted} rerouted")
            if skipped_optimal:
                parts.append(f"{skipped_optimal} on optimal path")
            if skipped_blocked:
                parts.append(f"{skipped_blocked} blocked")
            logs.append({
                "agent": "Monitor",
                "action": (
                    f"{skipped_total} shipment(s) already evaluated — "
                    f"standing by ({', '.join(parts)})."
                ),
            })

        return reroutes, logs, optimizer_reasoning

    @staticmethod
    def _path_cost(G: nx.DiGraph, path: list[str]) -> float:
        """Sum dynamic_weight along a path."""
        total = 0.0
        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            if G.has_edge(u, v):
                total += G[u][v].get("dynamic_weight", 0)
        return total
