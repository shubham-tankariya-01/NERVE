"""
supply_graph.py
Loads data from MongoDB into a NetworkX DiGraph and provides
helper methods to inspect the supply-chain network.
"""

import json
from pathlib import Path
from typing import Any

import networkx as nx
from backend.database import get_sync_db


class SupplyChainGraph:
    """Directed graph representation of the supply-chain network."""

    def __init__(self, from_db: bool = True) -> None:
        self.graph: nx.DiGraph = nx.DiGraph()
        self.shipments: list[dict] = []

        if from_db:
            self.refresh_from_db()
        else:
            # Fallback to local file if needed for testing
            self.data_path = Path(__file__).resolve().parent.parent / "mock_data.json"
            self._load_from_json()

    # ── data loading ──────────────────────────────────────────────

    def refresh_from_db(self) -> None:
        """Clear and reload the graph from MongoDB."""
        self.graph.clear()
        db = get_sync_db()
        
        try:
            nodes = list(db.nodes.find({}))
            routes = list(db.routes.find({}))
            shipments = list(db.shipments.find({}))

            for n in nodes:
                self.graph.add_node(
                    n["id"],
                    name=n["name"],
                    type=n["type"],
                    location={"lat": n["lat"], "lng": n["lng"]},
                    capacity=n["capacity"],
                    current_load=n["current_load"],
                    status=n["status"],
                    risk_level=n["risk_level"],
                    processing_time_hrs=n.get("capacity", 100) / 20,
                )

            for r in routes:
                self.graph.add_edge(
                    r["from_node"],
                    r["to_node"],
                    id=r["id"],
                    transport_mode=r["transport_mode"],
                    distance_km=r["distance_km"],
                    base_transit_time_hrs=r["base_transit_time_hrs"],
                    cost_per_unit=r["cost_per_unit"],
                    risk_factor=r["risk_factor"],
                    status="active",
                )

            self.shipments = []
            for s in shipments:
                s.pop("_id", None) # Remove ObjectId for JSON serialization
                self.shipments.append(s)
        except Exception as e:
            print(f"Error refreshing from MongoDB: {e}. Falling back to local mock_data.json.")
            self.data_path = Path(__file__).resolve().parent.parent / "mock_data.json"
            self._load_from_json()

    def _load_from_json(self) -> None:
        """Fallback: Read JSON and populate the graph."""
        with open(self.data_path, "r", encoding="utf-8") as f:
            raw = json.load(f)

        for node in raw["nodes"]:
            nid = node["id"]
            self.graph.add_node(
                nid,
                name=node["name"],
                type=node["type"],
                location=node["location"],
                capacity=node["capacity"],
                processing_time_hrs=node.get("processing_time_hrs", 24),
                current_load=node["current_load"],
                status=node["status"],
                risk_level=node["risk_level"],
            )

        for route in raw["routes"]:
            self.graph.add_edge(
                route["from_node"],
                route["to_node"],
                id=route["id"],
                transport_mode=route["transport_mode"],
                distance_km=route["distance_km"],
                base_transit_time_hrs=route["base_transit_time_hrs"],
                cost_per_unit=route["cost_per_unit"],
                risk_factor=route["risk_factor"],
                status=route.get("status", "active"),
            )
        self.shipments = raw["shipments"]

    # ── inspection helpers ────────────────────────────────────────

    def summary(self) -> str:
        """Return a compact text summary of the network."""
        lines: list[str] = []
        lines.append("=" * 64)
        lines.append("  SUPPLY-CHAIN NETWORK SUMMARY (MONGODB-BACKED)")
        lines.append("=" * 64)
        lines.append(f"  Nodes : {self.graph.number_of_nodes()}")
        lines.append(f"  Edges : {self.graph.number_of_edges()}")
        lines.append(f"  Shipments loaded : {len(self.shipments)}")
        lines.append("")

        # ── nodes by type ──
        type_groups: dict[str, list[str]] = {}
        for nid, attrs in self.graph.nodes(data=True):
            ntype = attrs.get("type", "unknown")
            type_groups.setdefault(ntype, []).append(nid)

        lines.append("  NODES BY TYPE")
        lines.append("  " + "-" * 40)
        for ntype, nids in sorted(type_groups.items()):
            lines.append(f"    {ntype:24s} ({len(nids)})")
            for nid in nids:
                name = self.graph.nodes[nid]["name"]
                status = self.graph.nodes[nid]["status"]
                risk = self.graph.nodes[nid]["risk_level"]
                lines.append(f"      {nid}  {name:36s}  status={status:12s}  risk={risk}")
        lines.append("")

        # ── edges grouped by transport mode ──
        mode_groups: dict[str, list[tuple]] = {}
        for u, v, attrs in self.graph.edges(data=True):
            mode = attrs.get("transport_mode", "unknown")
            mode_groups.setdefault(mode, []).append((u, v, attrs))

        lines.append("  ROUTES BY TRANSPORT MODE")
        lines.append("  " + "-" * 40)
        for mode, edges in sorted(mode_groups.items()):
            lines.append(f"    {mode} ({len(edges)} routes)")
            for u, v, attrs in edges:
                rid = attrs["id"]
                dist = attrs["distance_km"]
                time = attrs["base_transit_time_hrs"]
                cost = attrs["cost_per_unit"]
                lines.append(
                    f"      {rid}  {u} -> {v}   "
                    f"{dist:>7,} km   {time:>4}h   ${cost}/unit"
                )
        lines.append("")

        # ── shipment status breakdown ──
        status_counts: dict[str, int] = {}
        for s in self.shipments:
            st = s["status"]
            status_counts[st] = status_counts.get(st, 0) + 1

        lines.append("  SHIPMENT STATUS BREAKDOWN")
        lines.append("  " + "-" * 40)
        for st, count in sorted(status_counts.items()):
            lines.append(f"    {st:16s} : {count}")
        lines.append("")
        lines.append("=" * 64)

        return "\n".join(lines)

    def print_summary(self) -> None:
        """Print the network summary to stdout."""
        print(self.summary())


# ── standalone run ────────────────────────────────────────────────
if __name__ == "__main__":
    scg = SupplyChainGraph()
    scg.print_summary()
