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

def migrate_multi_user():
    """
    Extends the database for multi-user, multi-company support.
    Idempotent: Safe to run multiple times.
    """
    from passlib.context import CryptContext
    from datetime import datetime, timezone
    import pymongo

    db = get_sync_db()
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    # 1. Create a default company
    print("Initializing default company...")
    company_id = "company_demo"
    db.companies.update_one(
        {"id": company_id},
        {"$set": {
            "id": company_id,
            "name": "Demo Logistics Co",
            "plan": "professional",
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "owner_email": "admin@demo.com"
        }},
        upsert=True
    )

    # 2. Create platform admin user
    print("Creating platform admin...")
    admin_pwd = pwd_context.hash("nerve_admin_2024")
    db.users.update_one(
        {"username": "platform_admin"},
        {"$set": {
            "username": "platform_admin",
            "email": "admin@nerve.io",
            "role": "platform_admin",
            "company_id": None,
            "hashed_password": admin_pwd,
            "is_active": True,
            "full_name": "System Administrator"
        }},
        upsert=True
    )

    # 3. Create demo logistics manager
    print("Creating demo logistics manager...")
    manager_pwd = pwd_context.hash("demo1234")
    db.users.update_one(
        {"username": "manager"},
        {"$set": {
            "username": "manager",
            "email": "manager@demo.com",
            "role": "logistics_manager",
            "company_id": company_id,
            "hashed_password": manager_pwd,
            "is_active": True,
            "full_name": "Demo Manager"
        }},
        upsert=True
    )

    # 4. Create demo node operator
    print("Creating demo node operator...")
    operator_pwd = pwd_context.hash("demo1234")
    db.users.update_one(
        {"username": "operator"},
        {"$set": {
            "username": "operator",
            "email": "operator@demo.com",
            "role": "node_operator",
            "company_id": company_id,
            "assigned_node_ids": ["N05", "N08"],
            "hashed_password": operator_pwd,
            "is_active": True,
            "full_name": "Demo Operator"
        }},
        upsert=True
    )

    # 5. Add company_id to existing nodes
    print("Tagging existing nodes with company_id...")
    db.nodes.update_many(
        {"company_id": {"$exists": False}},
        {"$set": {"company_id": company_id}}
    )

    # 6. Add company_id to existing shipments
    print("Tagging existing shipments with company_id...")
    db.shipments.update_many(
        {"company_id": {"$exists": False}},
        {"$set": {"company_id": company_id}}
    )

    # 7. Create indexes
    print("Creating indexes...")
    # reroute_approvals: company_id, status, created_at
    db.reroute_approvals.create_index([("company_id", 1), ("status", 1), ("created_at", -1)])
    
    # node_checkins: shipment_id, node_id, timestamp
    db.node_checkins.create_index([("shipment_id", 1), ("node_id", 1), ("timestamp", -1)])
    
    # users: email (unique), username (unique)
    db.users.create_index("email", unique=True)
    db.users.create_index("username", unique=True)

    print("Multi-user migration complete.")

if __name__ == "__main__":
    migrate_data()
    migrate_multi_user()
