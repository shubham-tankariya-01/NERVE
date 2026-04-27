"""
cascade_model.py
Calculates dynamic risk scores, cascade debt (R0 contagion), cascade
propagation simulation, and a global network health metric.

This module is the "Intelligence Engine" described in Section 6 of the
detailed ideation — it quantifies disruption risk at each node, models
cascading network failures, and produces a single network health score.
"""

from __future__ import annotations

import networkx as nx

from backend.graph.supply_graph import SupplyChainGraph
from backend.ml.anomaly import DisruptionAlert, Severity


# ── 1. Dynamic Node Risk Scores ─────────────────────────────────

def compute_node_risk_scores(
    scg: SupplyChainGraph,
    alerts: list[DisruptionAlert] | None = None,
) -> dict[str, float]:
    """
    Compute a dynamic risk_score ∈ [0, 1] for every node.

    Components (weighted sum):
      • weather_risk   (0.45) — severity of any active weather alert
      • congestion     (0.35) — current_load / capacity
      • base_risk      (0.20) — static risk_level from mock_data

    Returns a dict mapping node_id → risk_score.
    """
    if alerts is None:
        alerts = []

    # Build alert lookup: node_id → worst severity
    alert_severity: dict[str, Severity] = {}
    for a in alerts:
        existing = alert_severity.get(a.node_id)
        if existing is None or _sev_rank(a.severity) > _sev_rank(existing):
            alert_severity[a.node_id] = a.severity

    scores: dict[str, float] = {}

    for nid, attrs in scg.graph.nodes(data=True):
        # --- weather component ---
        sev = alert_severity.get(nid)
        if sev == Severity.CRITICAL:
            weather_risk = 1.0
        elif sev == Severity.HIGH:
            weather_risk = 0.75
        elif sev == Severity.MEDIUM:
            weather_risk = 0.45
        elif sev == Severity.LOW:
            weather_risk = 0.2
        else:
            weather_risk = 0.0

        # --- congestion component ---
        capacity = max(attrs.get("capacity", 1), 1)
        load = attrs.get("current_load", 0)
        congestion = min(load / capacity, 1.0)

        # --- base risk component ---
        risk_str = attrs.get("risk_level", "low").lower()
        base_risk = {"high": 0.8, "medium": 0.5, "low": 0.2}.get(risk_str, 0.2)

        # --- weighted sum ---
        risk_score = (0.45 * weather_risk) + (0.35 * congestion) + (0.20 * base_risk)
        scores[nid] = round(min(risk_score, 1.0), 3)

    return scores


def _sev_rank(s: Severity) -> int:
    return {Severity.LOW: 1, Severity.MEDIUM: 2, Severity.HIGH: 3, Severity.CRITICAL: 4}[s]


# ── 2. Cascade Debt (R0 Contagion Score) ────────────────────────

def calculate_cascade_debt(
    scg: SupplyChainGraph,
    risk_scores: dict[str, float] | None = None,
) -> list[dict]:
    """
    Rank nodes by structural fragility.

    Score = betweenness_centrality × 50
          + utilization × 30
          + processing_time × 0.5
          + risk_score × 20          ← NEW: dynamic weather-aware factor

    Multiplied by static risk_level modifier (high=1.5, medium=1.2).
    """
    if scg.graph.number_of_nodes() == 0:
        return []
    if risk_scores is None:
        risk_scores = {}

    centrality = nx.betweenness_centrality(scg.graph)

    results = []
    for nid, attrs in scg.graph.nodes(data=True):
        bc = centrality.get(nid, 0.0)
        capacity = max(attrs.get("capacity", 1), 1)
        load = attrs.get("current_load", 0)
        utilization = load / capacity
        processing_time = attrs.get("processing_time_hrs", 0)
        rs = risk_scores.get(nid, 0.0)

        r0 = (bc * 50) + (utilization * 30) + (processing_time * 0.5) + (rs * 20)

        risk_str = attrs.get("risk_level", "low").lower()
        if risk_str == "high":
            r0 *= 1.5
        elif risk_str == "medium":
            r0 *= 1.2

        results.append({
            "node_id": nid,
            "node_name": attrs.get("name", "Unknown"),
            "type": attrs.get("type", "unknown"),
            "risk_score": rs,
            "utilization_pct": min(100, round(utilization * 100)),
            "centrality": round(bc, 3),
            "cascade_debt": round(r0, 1),
        })

    results.sort(key=lambda x: x["cascade_debt"], reverse=True)
    return results


# ── 3. Cascade Simulation ───────────────────────────────────────

def simulate_cascade(
    scg: SupplyChainGraph,
    failed_node_id: str,
) -> dict:
    """
    Simulate a single-node failure and measure the ripple effect.

    Process (per Section 6.4 of the detailed ideation):
      1. Mark the node as failed (capacity → 0)
      2. Redistribute its pending load to immediate downstream neighbors
      3. Check if any neighbor now exceeds capacity → mark overloaded
      4. Count affected shipments

    Returns dict with cascade_impact_score, affected_nodes, affected_shipments_count.
    """
    G = scg.graph
    if failed_node_id not in G:
        return {"cascade_impact_score": 0, "affected_nodes": [], "affected_shipments_count": 0}

    overloaded_nodes: list[str] = []
    failed_attrs = G.nodes[failed_node_id]
    spill_load = failed_attrs.get("current_load", 0)

    # Downstream neighbors (successors in directed graph)
    successors = list(G.successors(failed_node_id))
    share = spill_load / max(len(successors), 1)

    for succ in successors:
        s_attrs = G.nodes[succ]
        cap = max(s_attrs.get("capacity", 1), 1)
        current = s_attrs.get("current_load", 0)
        if (current + share) > cap:
            overloaded_nodes.append(succ)

    # Count shipments whose planned_route passes through the failed node
    affected_shipments = 0
    for ship in scg.shipments:
        if ship.get("status") == "delivered":
            continue
        if failed_node_id in ship.get("planned_route", []):
            affected_shipments += 1

    total_affected = [failed_node_id] + overloaded_nodes
    impact_score = round(len(total_affected) / max(G.number_of_nodes(), 1), 3)

    return {
        "cascade_impact_score": impact_score,
        "affected_nodes": total_affected,
        "affected_shipments_count": affected_shipments,
    }


# ── 4. Network Health Score ─────────────────────────────────────

def compute_network_health(
    scg: SupplyChainGraph,
    risk_scores: dict[str, float] | None = None,
    alerts: list[DisruptionAlert] | None = None,
) -> int:
    """
    Global system metric: network_health ∈ [0, 100].

    Starts at 100 and deducts for:
      • Average risk across all nodes  (up to −30)
      • Active HIGH/CRITICAL alerts     (up to −35)
      • Average congestion              (up to −20)
      • Any cascade risk (nodes > 80% util with high centrality) (up to −15)
    """
    if risk_scores is None:
        risk_scores = {}
    if alerts is None:
        alerts = []

    health = 100.0

    # --- average risk penalty ---
    if risk_scores:
        avg_risk = sum(risk_scores.values()) / len(risk_scores)
        health -= avg_risk * 30  # max -30

    # --- alert penalty ---
    for a in alerts:
        if a.severity == Severity.CRITICAL:
            health -= 12
        elif a.severity == Severity.HIGH:
            health -= 7
        elif a.severity == Severity.MEDIUM:
            health -= 3

    # --- congestion penalty ---
    congestion_vals = []
    for _, attrs in scg.graph.nodes(data=True):
        cap = max(attrs.get("capacity", 1), 1)
        load = attrs.get("current_load", 0)
        congestion_vals.append(min(load / cap, 1.0))
    if congestion_vals:
        avg_congestion = sum(congestion_vals) / len(congestion_vals)
        health -= avg_congestion * 20  # max -20

    # --- cascade fragility penalty ---
    centrality = nx.betweenness_centrality(scg.graph)
    fragile_count = 0
    for nid, attrs in scg.graph.nodes(data=True):
        cap = max(attrs.get("capacity", 1), 1)
        util = attrs.get("current_load", 0) / cap
        if util > 0.8 and centrality.get(nid, 0) > 0.05:
            fragile_count += 1
    health -= min(fragile_count * 5, 15)  # max -15

    return max(0, min(100, round(health)))


# ── standalone test ──────────────────────────────────────────────

if __name__ == "__main__":
    scg = SupplyChainGraph()
    rs = compute_node_risk_scores(scg)
    print("\n--- DYNAMIC RISK SCORES ---")
    for nid, score in sorted(rs.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"  {nid}: {score}")

    debt = calculate_cascade_debt(scg, rs)
    print("\n--- CASCADE DEBT (Top 5) ---")
    for r in debt[:5]:
        print(f"  [{r['cascade_debt']:>5.1f}] {r['node_id']} ({r['node_name']}) risk={r['risk_score']}")

    health = compute_network_health(scg, rs)
    print(f"\n--- NETWORK HEALTH: {health}/100 ---\n")
