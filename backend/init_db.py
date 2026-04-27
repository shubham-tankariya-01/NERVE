import json
import os
from pathlib import Path
from backend.database import get_sync_db

def migrate_data():
    db = get_sync_db()
    
    # Path to mock_data.json
    data_path = Path(__file__).resolve().parent / "mock_data.json"
    
    if not data_path.exists():
        print(f"Error: {data_path} not found.")
        return

    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Migrate Nodes
    print("Migrating nodes...")
    db.nodes.delete_many({}) # Clear for clean migration
    nodes_to_insert = []
    for n in data["nodes"]:
        nodes_to_insert.append({
            "id": n["id"],
            "name": n["name"],
            "type": n["type"],
            "lat": n["location"]["lat"],
            "lng": n["location"]["lng"],
            "capacity": n["capacity"],
            "current_load": n["current_load"],
            "status": n["status"],
            "risk_level": n["risk_level"]
        })
    if nodes_to_insert:
        db.nodes.insert_many(nodes_to_insert)

    # 2. Migrate Routes
    print("Migrating routes...")
    db.routes.delete_many({})
    routes_to_insert = []
    for r in data["routes"]:
        routes_to_insert.append({
            "id": r["id"],
            "from_node": r["from_node"],
            "to_node": r["to_node"],
            "transport_mode": r["transport_mode"],
            "distance_km": r["distance_km"],
            "base_transit_time_hrs": r["base_transit_time_hrs"],
            "cost_per_unit": r["cost_per_unit"],
            "risk_factor": r["risk_factor"]
        })
    if routes_to_insert:
        db.routes.insert_many(routes_to_insert)

    # 3. Migrate Shipments
    print("Migrating shipments...")
    db.shipments.delete_many({})
    shipments_to_insert = []
    for s in data["shipments"]:
        shipments_to_insert.append({
            "id": s["id"],
            "origin": s["origin"],
            "destination": s["destination"],
            "current_node": s["current_node"],
            "status": s["status"],
            "priority": s["priority"],
            "cargo_type": s["cargo_type"],
            "weight_kg": s["weight_kg"],
            "planned_route": s["planned_route"],
            "route_taken": s["route_taken"],
            "estimated_arrival": s["estimated_arrival"],
            "departure_time": s.get("departure_time")
        })
    if shipments_to_insert:
        db.shipments.insert_many(shipments_to_insert)

    # 4. Create a default admin user
    print("Creating admin user...")
    db.users.update_one(
        {"username": "admin"},
        {"$set": {
            "username": "admin",
            "password_hash": "admin123",
            "role": "ADMIN"
        }},
        upsert=True
    )

    print("MongoDB Migration complete.")

if __name__ == "__main__":
    migrate_data()
