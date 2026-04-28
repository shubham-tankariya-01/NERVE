import asyncio
import json
import random
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

# Configuration
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "nerve_db"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

COMPANIES = [
    {"name": "Apex Logistics", "plan": "enterprise", "id": "apex_log"},
    {"name": "Oceanic Freight", "plan": "professional", "id": "oceanic_fr"},
    {"name": "Atlas Supply", "plan": "starter", "id": "atlas_sup"},
    {"name": "Global Transit", "plan": "enterprise", "id": "global_tr"},
    {"name": "Vertex Carriers", "plan": "professional", "id": "vertex_car"}
]

NODE_TYPES = ["factory", "port", "warehouse", "distribution_center", "retail_hub"]
TRANSPORT_MODES = ["truck", "sea", "rail", "air"]

async def seed_data():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Clear existing data
    collections = ["companies", "users", "nodes", "routes", "shipments", "decision_logs", "node_checkins", "reroute_approvals"]
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

    # 2. Create Companies and Users
    all_nodes = []
    all_routes = []
    
    for comp in COMPANIES:
        comp_id = comp["id"]
        safe_name = comp["name"].lower().replace(" ", "")
        
        # Insert Company
        await db.companies.insert_one({
            "id": comp_id,
            "name": comp["name"],
            "plan": comp["plan"],
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "owner_email": f"manager@{safe_name}.com"
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

        # Insert Customers (2 per company)
        for i in range(1, 3):
            cust_email = f"customer{i}@{safe_name}.com"
            cust_pwd = pwd_context.hash(f"{safe_name}-customer{i}")
            await db.users.insert_one({
                "username": f"{safe_name}_customer{i}",
                "email": cust_email,
                "role": "customer",
                "company_id": comp_id,
                "hashed_password": cust_pwd,
                "is_active": True,
                "full_name": f"Customer {i} ({comp['name']})",
                "is_verified": True,
                "created_at": datetime.now(timezone.utc)
            })

        # 3. Generate 10 Nodes for this company
        comp_nodes = []
        for i in range(1, 11):
            node_id = f"{comp_id.upper()[:2]}{i:02d}"
            node_type = random.choice(NODE_TYPES)
            node = {
                "id": node_id,
                "name": f"{comp['name']} {node_type.replace('_', ' ').title()} {i}",
                "type": node_type,
                "lat": random.uniform(-60, 70),
                "lng": random.uniform(-180, 180),
                "capacity": random.randint(300, 1500),
                "current_load": random.randint(50, 250),
                "status": "operational",
                "risk_level": random.choice(["low", "low", "medium", "high"]),
                "company_id": comp_id
            }
            comp_nodes.append(node)
            all_nodes.append(node)
        
        await db.nodes.insert_many(comp_nodes)

        # 4. Create Varied Node Managers per company (2-3)
        num_ops = random.randint(2, 3)
        nodes_per_op = len(comp_nodes) // num_ops
        
        for i in range(num_ops):
            start_idx = i * nodes_per_op
            # Last operator takes all remaining nodes
            end_idx = (i + 1) * nodes_per_op if i < num_ops - 1 else len(comp_nodes)
            nodes_subset = comp_nodes[start_idx:end_idx]
            
            op_email = f"nodemanager{i+1}@{safe_name}.com"
            op_pwd = pwd_context.hash(f"{safe_name}-nodemanager{i+1}")
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

        # 5. Internal Routes (for each company) - 15 routes per company
        comp_routes = []
        for _ in range(15):
            n1, n2 = random.sample(comp_nodes, 2)
            dist = random.uniform(50, 2000)
            mode = random.choice(TRANSPORT_MODES)
            route = {
                "id": f"R-{comp_id}-{len(comp_routes)}",
                "from_node": n1["id"],
                "to_node": n2["id"],
                "transport_mode": mode,
                "distance_km": round(dist, 2),
                "base_transit_time_hrs": round(dist / 60, 1),
                "cost_per_unit": round(dist * 0.1, 2),
                "risk_factor": round(random.uniform(0.01, 0.15), 3),
                "company_id": comp_id
            }
            comp_routes.append(route)
            all_routes.append(route)
        await db.routes.insert_many(comp_routes)

    # 6. Global Routes (Inter-company connectivity) - 25 routes
    inter_routes = []
    for _ in range(25):
        n1 = random.choice(all_nodes)
        n2 = random.choice([n for n in all_nodes if n["company_id"] != n1["company_id"]])
        dist = random.uniform(2000, 15000)
        mode = "sea" if dist > 5000 else random.choice(TRANSPORT_MODES)
        route = {
            "id": f"R-GLOB-{len(inter_routes)}",
            "from_node": n1["id"],
            "to_node": n2["id"],
            "transport_mode": mode,
            "distance_km": round(dist, 2),
            "base_transit_time_hrs": round(dist / 500 if mode=="air" else dist/80, 1),
            "cost_per_unit": round(dist * 0.05, 2),
            "risk_factor": round(random.uniform(0.05, 0.25), 3)
        }
        inter_routes.append(route)
        all_routes.append(route)
    await db.routes.insert_many(inter_routes)

    # 7. Shipments - 50 total
    shipments = []
    for i in range(1, 51):
        comp = random.choice(COMPANIES)
        comp_id = comp["id"]
        # Filter nodes by company or allow cross-company if multi-tenant logic permits
        # User said "The route comes under each companies the node for respective companies should be displayed to the companies only"
        # So shipments for a company should ideally use their nodes.
        comp_nodes_list = [n for n in all_nodes if n["company_id"] == comp_id]
        origin, dest = random.sample(comp_nodes_list, 2)
        
        status = random.choice(["in_transit", "in_transit", "delayed", "flagged", "completed"])
        shipment = {
            "id": f"SHP-{comp_id.upper()}-{i:03d}",
            "origin": origin["id"],
            "destination": dest["id"],
            "current_node": origin["id"] if status != "completed" else dest["id"],
            "status": status,
            "priority": random.choice(["low", "medium", "high", "critical"]),
            "cargo_type": random.choice(["Electronics", "Pharma", "Raw Materials", "Automotive", "Retail"]),
            "weight_kg": random.uniform(100, 5000),
            "planned_route": [origin["id"], dest["id"]],
            "route_taken": [origin["id"]],
            "company_id": comp_id,
            "customer_id": f"{comp['name'].lower().replace(' ', '')}_customer1",
            "estimated_arrival": (datetime.now() + timedelta(days=random.randint(2, 10))).isoformat(),
            "departure_time": (datetime.now() - timedelta(days=random.randint(1, 5))).isoformat()
        }
        shipments.append(shipment)
    
    await db.shipments.insert_many(shipments)

    print(f"Seeding complete!")
    print(f"- Companies: {len(COMPANIES)}")
    print(f"- Nodes: {len(all_nodes)}")
    print(f"- Routes: {len(all_routes)}")
    print(f"- Shipments: {len(shipments)}")
    print("- Detailed access list (Pass: company_name-role):")
    for c in COMPANIES:
        sn = c['name'].lower().replace(' ', '')
        print(f"  [{c['name']}]")
        print(f"    Manager: manager@{sn}.com / {sn}-manager")
        print(f"    Operator 1: nodemanager1@{sn}.com / {sn}-nodemanager1")
        print(f"    Customer 1: customer1@{sn}.com / {sn}-customer1")

if __name__ == "__main__":
    asyncio.run(seed_data())
