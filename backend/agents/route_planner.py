"""
route_planner.py
Computes the optimal initial route for a new shipment booking.

Reuses the same 4-factor cost function from the Optimizer agent
(time, monetary cost, risk, cascade impact) to ensure consistency
between initial routing and disruption rerouting.

Unlike the Optimizer (which adjusts existing routes around disruptions),
the RoutePlanner generates a complete route from scratch given an
origin, destination, cargo type, priority, and weight.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

import networkx as nx

from backend.graph.supply_graph import SupplyChainGraph
from backend.ml.anomaly import DisruptionAlert
from backend.agents.optimizer import PRIORITY_WEIGHTS, MAX_TIME, MAX_COST, MAX_CASCADE


# ── Transport mode icons ──────────────────────────────────────────
MODE_ICONS = {
    "sea": "🚢",
    "truck": "🚛",
    "rail": "🚂",
    "air": "✈️",
}


@dataclass
class RouteCandidate:
    """A single candidate route with full analytics."""
    path: list[str]
    total_transit_hrs: float
    total_cost: float
    total_distance_km: float
    hop_count: int
    composite_score: float      # The 4-factor weighted cost
    risk_score: float           # Average risk across path edges
    legs: list[dict]            # Per-hop breakdown


class RoutePlanner:
    """
    Computes the best initial route for a new shipment using the same
    dynamic cost function as the Optimizer agent.
    """

    def plan_route(
        self,
        origin: str,
        destination: str,
        priority: str,
        scg: SupplyChainGraph,
        alerts: list[DisruptionAlert] | None = None,
        risk_scores: dict[str, float] | None = None,
        cascade_debt: list[dict] | None = None,
        max_candidates: int = 3,
    ) -> list[RouteCandidate]:
        """
        Compute up to `max_candidates` best routes from origin to destination.

        Returns a list of RouteCandidate objects sorted by composite score
        (best first).
        """
        if alerts is None:
            alerts = []
        if risk_scores is None:
            risk_scores = {}
        if cascade_debt is None:
            cascade_debt = []

        # Build a synthetic shipment dict for the cost function
        synthetic_shipment = {
            "priority": priority,
            "current_node": origin,
            "destination": destination,
            "planned_route": [],
        }

        # Build the dynamic cost graph (same logic as Optimizer)
        dynamic_G = self._build_dynamic_cost_graph(
            scg, synthetic_shipment, alerts, risk_scores, cascade_debt
        )

        candidates: list[RouteCandidate] = []

        try:
            paths_gen = nx.shortest_simple_paths(
                dynamic_G, origin, destination, weight="dynamic_weight"
            )

            for idx, path in enumerate(paths_gen):
                if idx >= max_candidates:
                    break

                candidate = self._analyze_route(path, dynamic_G, scg)
                candidates.append(candidate)

        except nx.NetworkXNoPath:
            pass  # No viable route exists
        except nx.NodeNotFound:
            pass  # Invalid node IDs

        return candidates

    def _build_dynamic_cost_graph(
        self,
        scg: SupplyChainGraph,
        shipment: dict,
        alerts: list[DisruptionAlert],
        risk_scores: dict[str, float],
        cascade_debt: list[dict],
    ) -> nx.DiGraph:
        """
        Build a copy of the graph with dynamic_weight on each edge.
        Identical to OptimizerAgent._build_dynamic_cost_graph().
        """
        # Alert delay penalties: node_id → extra hours
        penalties: dict[str, float] = {}
        for a in alerts:
            penalties[a.node_id] = max(penalties.get(a.node_id, 0), a.estimated_delay_hrs)

        # Cascade debt lookup: node_id → score
        cascade_lookup: dict[str, float] = {}
        for entry in cascade_debt:
            cascade_lookup[entry["node_id"]] = entry["cascade_debt"]

        G = scg.graph.copy()

        priority = shipment.get("priority", "medium").lower()
        w_time, w_cost, w_risk, w_cascade = PRIORITY_WEIGHTS.get(
            priority, PRIORITY_WEIGHTS["medium"]
        )

        for u, v, attrs in G.edges(data=True):
            base_time = attrs.get("base_transit_time_hrs", 10)
            base_cost = attrs.get("cost_per_unit", 100)

            # Time: base transit + any disruption delay at the destination
            effective_time = base_time + penalties.get(v, 0.0)

            # Risk: dynamic risk_score of the destination node
            dest_risk = risk_scores.get(v, 0.0)

            # Cascade: structural fragility of the destination node
            dest_cascade = cascade_lookup.get(v, 0.0)

            # Normalize and compute composite weight
            norm_time = effective_time / MAX_TIME
            norm_cost = base_cost / MAX_COST
            norm_cascade = dest_cascade / MAX_CASCADE

            weight = (
                w_time * norm_time
                + w_cost * norm_cost
                + w_risk * dest_risk
                + w_cascade * norm_cascade
                + 0.02  # small hop penalty
            )

            G[u][v]["dynamic_weight"] = weight

        return G

    def _analyze_route(
        self,
        path: list[str],
        dynamic_G: nx.DiGraph,
        scg: SupplyChainGraph,
    ) -> RouteCandidate:
        """Build a fully analyzed RouteCandidate from a path."""
        total_time = 0.0
        total_cost = 0.0
        total_distance = 0.0
        total_score = 0.0
        total_risk = 0.0
        legs: list[dict] = []

        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            edge = dynamic_G[u][v] if dynamic_G.has_edge(u, v) else {}

            transit_hrs = edge.get("base_transit_time_hrs", 0)
            cost = edge.get("cost_per_unit", 0)
            distance = edge.get("distance_km", 0)
            mode = edge.get("transport_mode", "unknown")
            risk_factor = edge.get("risk_factor", 0)
            dyn_weight = edge.get("dynamic_weight", 0)

            # Also add processing time at destination node
            dest_attrs = scg.graph.nodes.get(v, {})
            processing_hrs = dest_attrs.get("processing_time_hrs", 0)

            total_time += transit_hrs + processing_hrs
            total_cost += cost
            total_distance += distance
            total_score += dyn_weight
            total_risk += risk_factor

            legs.append({
                "from": u,
                "to": v,
                "from_name": scg.graph.nodes.get(u, {}).get("name", u),
                "to_name": scg.graph.nodes.get(v, {}).get("name", v),
                "transport_mode": mode,
                "mode_icon": MODE_ICONS.get(mode, "📦"),
                "distance_km": distance,
                "transit_hrs": transit_hrs,
                "processing_hrs": processing_hrs,
                "cost_per_unit": cost,
                "risk_factor": risk_factor,
            })

        avg_risk = (total_risk / len(legs)) if legs else 0.0

        return RouteCandidate(
            path=path,
            total_transit_hrs=total_time,
            total_cost=total_cost,
            total_distance_km=total_distance,
            hop_count=len(path) - 1,
            composite_score=round(total_score, 4),
            risk_score=round(avg_risk, 4),
            legs=legs,
        )
