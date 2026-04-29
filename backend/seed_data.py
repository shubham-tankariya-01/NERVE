import asyncio
import json
import random
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(_env_path)

# Configuration
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "nerve_db")

import ssl
import certifi

is_local = "localhost" in MONGO_URL or "127.0.0.1" in MONGO_URL

if is_local:
    CLIENT_OPTIONS = {
        "serverSelectionTimeoutMS": 10000,
        "connectTimeoutMS": 10000,
        "socketTimeoutMS": 20000,
    }
else:
    # For Atlas: use tlsAllowInvalidCertificates as fallback if standard SSL fails
    CLIENT_OPTIONS = {
        "serverSelectionTimeoutMS": 10000,
        "connectTimeoutMS": 10000,
        "socketTimeoutMS": 20000,
        "tls": True,
        "tlsCAFile": certifi.where(),
        "retryWrites": True,
        "ssl": True,
    }

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

COMPANIES = [
    {
        "id": "comp_a",
        "name": "Solaris Global",
        "node_count": 25,
        "operator_count": 2,
        "safe_name": "solarisglobal"
    },
    {
        "id": "comp_b",
        "name": "Terra Nova Transit",
        "node_count": 35,
        "operator_count": 3,
        "safe_name": "terranovatransit"
    }
]

NODE_TYPES = ["factory", "port", "warehouse", "distribution_center", "retail_hub"]
TRANSPORT_MODES = ["truck", "rail", "air"]

LAND_BOUNDS = [
    {"lat": [25, 55], "lng": [-125, -70]},
    {"lat": [10, 60], "lng": [-10, 40]},
    {"lat": [15, 50], "lng": [70, 120]},
    {"lat": [-40, -15], "lng": [115, 150]},
    {"lat": [-35, 10], "lng": [-75, -40]}
]

def get_land_coord():
    bounds = random.choice(LAND_BOUNDS)
    return round(random.uniform(*bounds["lat"]), 4), round(random.uniform(*bounds["lng"]), 4)

async def seed_data():
    client = AsyncIOMotorClient(MONGO_URL, **CLIENT_OPTIONS)
    db = client[DB_NAME]

    # Clear existing data
    collections = ["companies", "users", "nodes", "routes", "shipments", "decision_logs", "node_checkins", "reroute_approvals", "alerts", "anomalies"]
    for coll in collections:
        await db[coll].delete_many({})
    
    print("Database cleared. Starting seeding...")

    # 1. Create Platform Admin
    admin_pwd = pwd_context.hash("nerve_admin_2024")
    await db.users.insert_one({
        "username": "platform_admin",
        "email": "admin@ex.com",
        "role": "platform_admin",
        "company_id": None,
        "hashed_password": admin_pwd,
        "is_active": True,
        "full_name": "System Administrator",
        "is_verified": True,
        "created_at": datetime.now(timezone.utc)
    })
    print("Admin created: admin@ex.com / nerve_admin_2024")

    all_nodes = []
    all_routes = []
    
    for comp in COMPANIES:
        comp_id = comp["id"]
        safe_name = comp["safe_name"]
        
        # Insert Company
        await db.companies.insert_one({
            "id": comp_id,
            "name": comp["name"],
            "plan": "enterprise",
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "owner_email": f"owner@{safe_name}.com"
        })

        # Insert Company Owner
        owner_email = f"owner@{safe_name}.com"
        owner_pwd = pwd_context.hash(f"{safe_name}-owner")
        await db.users.insert_one({
            "username": f"{safe_name}_owner",
            "email": owner_email,
            "role": "company_owner",
            "company_id": comp_id,
            "hashed_password": owner_pwd,
            "is_active": True,
            "full_name": f"{comp['name']} Owner",
            "is_verified": True,
            "created_at": datetime.now(timezone.utc)
        })

        # Insert Logistics Manager
        manager_pwd = pwd_context.hash(f"{safe_name}-manager")
        await db.users.insert_one({
            "username": f"{safe_name}_manager",
            "email": f"manager@{safe_name}.com",
            "role": "logistics_manager",
            "company_id": comp_id,
            "hashed_password": manager_pwd,
            "is_active": True,
            "full_name": f"{comp['name']} Manager",
            "is_verified": True,
            "created_at": datetime.now(timezone.utc)
        })

        # Insert Customer
        customer_pwd = pwd_context.hash(f"{safe_name}-customer")
        await db.users.insert_one({
            "username": f"{safe_name}_customer",
            "email": f"customer@{safe_name}.com",
            "role": "customer",
            "company_id": comp_id,
            "hashed_password": customer_pwd,
            "is_active": True,
            "full_name": f"{comp['name']} Customer",
            "is_verified": True,
            "created_at": datetime.now(timezone.utc)
        })

        # 3. Generate Nodes (Land only)
        comp_nodes = []
        for i in range(1, comp["node_count"] + 1):
            node_id = f"{comp_id.upper()[-1]}{i:02d}"
            node_type = random.choice(NODE_TYPES)
            lat, lng = get_land_coord()
            node = {
                "id": node_id,
                "name": f"{comp['name']} {node_type.replace('_', ' ').title()} {i}",
                "type": node_type,
                "lat": lat,
                "lng": lng,
                "capacity": random.randint(500, 2000),
                "current_load": random.randint(100, 400),
                "status": "operational",
                "risk_level": "low",
                "company_id": comp_id
            }
            comp_nodes.append(node)
            all_nodes.append(node)
        
        await db.nodes.insert_many(comp_nodes)

        # 4. Create Node Operators
        num_ops = comp["operator_count"]
        nodes_per_op = len(comp_nodes) // num_ops
        
        for i in range(num_ops):
            start_idx = i * nodes_per_op
            end_idx = (i + 1) * nodes_per_op if i < num_ops - 1 else len(comp_nodes)
            nodes_subset = comp_nodes[start_idx:end_idx]
            
            op_email = f"operator{i+1}@{safe_name}.com"
            op_pwd = pwd_context.hash(f"{safe_name}-operator{i+1}")
            await db.users.insert_one({
                "username": f"{safe_name}_op{i+1}",
                "email": op_email,
                "role": "node_operator",
                "company_id": comp_id,
                "assigned_node_ids": [n["id"] for n in nodes_subset],
                "hashed_password": op_pwd,
                "is_active": True,
                "full_name": f"{comp['name']} Operator {i+1}",
                "is_verified": True,
                "created_at": datetime.now(timezone.utc)
            })

        # 5. Internal Routes - Hub & Spoke
        comp_routes = []
        hub = comp_nodes[0]
        for node in comp_nodes:
            if node["id"] == hub["id"]: continue
            for n1, n2 in [(node, hub), (hub, node)]:
                dist = random.uniform(300, 2500)
                route = {
                    "id": f"R-{comp_id}-{n1['id']}-{n2['id']}",
                    "from_node": n1["id"],
                    "to_node": n2["id"],
                    "transport_mode": "truck" if dist < 1000 else random.choice(TRANSPORT_MODES),
                    "distance_km": round(dist, 2),
                    "base_transit_time_hrs": round(dist / 80, 1),
                    "cost_per_unit": round(dist * 0.15, 2),
                    "risk_factor": 0.02,
                    "company_id": comp_id
                }
                comp_routes.append(route)
        await db.routes.insert_many(comp_routes)
        all_routes.extend(comp_routes)

    # 7. Shipments - 100 total
    shipments = []
    for i in range(1, 101):
        comp = random.choice(COMPANIES)
        comp_id = comp["id"]
        comp_nodes_list = [n for n in all_nodes if n["company_id"] == comp_id]
        origin, dest = random.sample(comp_nodes_list, 2)
        
        status = random.choice(["in_transit", "in_transit", "delayed", "flagged"])
        shipment = {
            "id": f"SHP-{comp_id.upper()[-1]}-{i:03d}",
            "origin": origin["id"],
            "destination": dest["id"],
            "current_node": origin["id"],
            "status": status,
            "priority": random.choice(["low", "medium", "high", "critical"]),
            "cargo_type": random.choice(["electronics", "medical_supplies", "machinery"]),
            "weight_kg": random.uniform(200, 8000),
            "planned_route": [origin["id"], dest["id"]],
            "route_taken": [origin["id"]],
            "company_id": comp_id,
            "customer_id": f"customer_{random.randint(1, 20)}",
            "estimated_arrival": (datetime.now() + timedelta(days=random.randint(3, 12))).isoformat(),
            "departure_time": (datetime.now() - timedelta(days=random.randint(1, 4))).isoformat()
        }
        shipments.append(shipment)
    
    await db.shipments.insert_many(shipments)

    print(f"Seeding complete!")
    print(f"- Nodes: {len(all_nodes)}")
    print(f"- Routes: {len(all_routes)}")
    print(f"- Shipments: {len(shipments)}")

if __name__ == "__main__":
    asyncio.run(seed_data())
