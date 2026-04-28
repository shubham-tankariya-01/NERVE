"""
supply_graph.py
Loads data from MongoDB into a NetworkX DiGraph and provides
helper methods to inspect the supply-chain network.
"""

import logging
from typing import Any

import networkx as nx

from backend.database import get_sync_db

log = logging.getLogger("nerve.graph")


class SupplyChainGraph:
    """Directed graph representation of the supply-chain network."""

    def __init__(self, from_db: bool = True) -> None:
        self.graph: nx.DiGraph = nx.DiGraph()
        self.shipments: list[dict] = []

        if from_db:
            self.refresh_from_db()

    def refresh_from_db(self) -> None:
        """Reload the graph from MongoDB without dropping the last good snapshot."""
        db = get_sync_db()
        next_graph = nx.DiGraph()

        try:
            nodes = list(db.nodes.find({}))
            routes = list(db.routes.find({}))
            shipments = list(db.shipments.find({}))

            for node in nodes:
                next_graph.add_node(
                    node["id"],
                    name=node["name"],
                    type=node["type"],
                    location={"lat": node["lat"], "lng": node["lng"]},
                    capacity=node["capacity"],
                    current_load=node["current_load"],
                    status=node["status"],
                    risk_level=node["risk_level"],
                    company_id=node.get("company_id"),
                    processing_time_hrs=node.get("capacity", 100) / 20,
                )

            for route in routes:
                next_graph.add_edge(
                    route["from_node"],
                    route["to_node"],
                    id=route["id"],
                    transport_mode=route["transport_mode"],
                    distance_km=route["distance_km"],
                    base_transit_time_hrs=route["base_transit_time_hrs"],
                    cost_per_unit=route["cost_per_unit"],
                    risk_factor=route["risk_factor"],
                    company_id=route.get("company_id"),
                    status="active",
                )

            from backend.serializers import serialize_list

            next_shipments = serialize_list(shipments)
        except Exception as exc:
            if self.graph.number_of_nodes() == 0 and not self.shipments:
                log.error(
                    "MongoDB refresh failed and no cached network snapshot exists: %s",
                    exc,
                )
            else:
                log.warning(
                    "MongoDB refresh failed; keeping last known network snapshot: %s",
                    exc,
                )
            return

        self.graph = next_graph
        self.shipments = next_shipments

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

        type_groups: dict[str, list[str]] = {}
        for node_id, attrs in self.graph.nodes(data=True):
            node_type = attrs.get("type", "unknown")
            type_groups.setdefault(node_type, []).append(node_id)

        lines.append("  NODES BY TYPE")
        lines.append("  " + "-" * 40)
        for node_type, node_ids in sorted(type_groups.items()):
            lines.append(f"    {node_type:24s} ({len(node_ids)})")
            for node_id in node_ids:
                name = self.graph.nodes[node_id]["name"]
                status = self.graph.nodes[node_id]["status"]
                risk = self.graph.nodes[node_id]["risk_level"]
                lines.append(
                    f"      {node_id}  {name:36s}  status={status:12s}  risk={risk}"
                )
        lines.append("")

        mode_groups: dict[str, list[tuple]] = {}
        for start, end, attrs in self.graph.edges(data=True):
            mode = attrs.get("transport_mode", "unknown")
            mode_groups.setdefault(mode, []).append((start, end, attrs))

        lines.append("  ROUTES BY TRANSPORT MODE")
        lines.append("  " + "-" * 40)
        for mode, edges in sorted(mode_groups.items()):
            lines.append(f"    {mode} ({len(edges)} routes)")
            for start, end, attrs in edges:
                route_id = attrs["id"]
                dist = attrs["distance_km"]
                travel_time = attrs["base_transit_time_hrs"]
                cost = attrs["cost_per_unit"]
                lines.append(
                    f"      {route_id}  {start} -> {end}   "
                    f"{dist:>7,} km   {travel_time:>4}h   ${cost}/unit"
                )
        lines.append("")

        status_counts: dict[str, int] = {}
        for shipment in self.shipments:
            shipment_status = shipment["status"]
            status_counts[shipment_status] = status_counts.get(shipment_status, 0) + 1

        lines.append("  SHIPMENT STATUS BREAKDOWN")
        lines.append("  " + "-" * 40)
        for shipment_status, count in sorted(status_counts.items()):
            lines.append(f"    {shipment_status:16s} : {count}")
        lines.append("")
        lines.append("=" * 64)

        return "\n".join(lines)

    def print_summary(self) -> None:
        """Print the network summary to stdout."""
        print(self.summary())


if __name__ == "__main__":
    graph = SupplyChainGraph()
    graph.print_summary()
