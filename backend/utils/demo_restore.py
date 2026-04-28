import asyncio
import random
import networkx as nx
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

log = logging.getLogger("nerve.admin")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Land Bounding Boxes (Approximate)
LAND_BOUNDS = [
    {"lat": [25, 55], "lng": [-125, -70]},   # North America
    {"lat": [10, 60], "lng": [-10, 40]},    # Europe / Africa
    {"lat": [15, 50], "lng": [70, 120]},    # Asia
    {"lat": [-40, -15], "lng": [115, 150]}, # Australia
    {"lat": [-35, 10], "lng": [-75, -40]}   # South America
]

COMPANIES_CONFIG = [
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
TRANSPORT_MODES = ["truck", "rail", "air"] # Removed 'sea' as requested "land portion only" - though ports exist on coasts

def get_land_coord():
    bounds = random.choice(LAND_BOUNDS)
    return round(random.uniform(*bounds["lat"]), 4), round(random.uniform(*bounds["lng"]), 4)

async def restore_demo_data(db: AsyncIOMotorDatabase):
    """
    Refines the database according to new requirements:
    - Only 2 companies (A: 25 nodes, B: 35 nodes)
    - Land-based coordinates only
    - Specific user roles and counts
    - Skips email verification (is_verified=True)
    - Clears all previous data
    """
    log.info("Wiping database for clean restore...")
    
    # 1. Thoroughly clear ALL relevant collections
    collections = [
        "users", "companies", "nodes", "routes", "shipments", 
        "decision_logs", "reroute_history", "reroute_approvals",
        "alerts", "anomalies", "weather_cache"
    ]
    for coll in collections:
        await db[coll].delete_many({})

    log.info("Database cleared. Starting re-seed...")

    # 2. Platform Admin (Remains as is)
    admin_pwd = pwd_context.hash("nerve_admin_2024")
    await db.users.insert_one({
        "username": "platform_admin",
        "email": "admin@ex.com",
        "role": "platform_admin",
        "company_id": None,
        "hashed_password": admin_pwd,
        "is_active": True,
        "full_name": "System Administrator",
        "is_verified": True, # Skip verification
        "created_at": datetime.now(timezone.utc)
    })

    all_nodes = []
    all_routes = []

    for comp in COMPANIES_CONFIG:
        comp_id = comp["id"]
        safe_name = comp["safe_name"]
        
        # 3. Insert Company
        await db.companies.insert_one({
            "id": comp_id,
            "name": comp["name"],
            "plan": "enterprise",
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "owner_email": f"owner@{safe_name}.com"
        })

        # 4. Insert Company Owner
        owner_pwd = pwd_context.hash(f"{safe_name}-owner")
        await db.users.insert_one({
            "username": f"{safe_name}_owner",
            "email": f"owner@{safe_name}.com",
            "role": "company_owner",
            "company_id": comp_id,
            "hashed_password": owner_pwd,
            "is_active": True,
            "full_name": f"{comp['name']} Owner",
            "is_verified": True, # Skip verification
            "created_at": datetime.now(timezone.utc)
        })

        # 5. Insert Logistics Manager
        manager_pwd = pwd_context.hash(f"{safe_name}-manager")
        await db.users.insert_one({
            "username": f"{safe_name}_manager",
            "email": f"manager@{safe_name}.com",
            "role": "logistics_manager",
            "company_id": comp_id,
            "hashed_password": manager_pwd,
            "is_active": True,
            "full_name": f"{comp['name']} Manager",
            "is_verified": True, # Skip verification
            "created_at": datetime.now(timezone.utc)
        })

        # 6. Generate Nodes (Land only)
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

        # 7. Create Node Operators
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
                "is_verified": True, # Skip verification
                "created_at": datetime.now(timezone.utc)
            })

        # 8. Routes - Hub & Spoke for connectivity
        comp_routes = []
        hub = comp_nodes[0] # Simplest: first node is hub
        for node in comp_nodes:
            if node["id"] == hub["id"]: continue
            # Bi-directional routes
            for n1, n2 in [(node, hub), (hub, node)]:
                dist = random.uniform(300, 2500)
                mode = "truck" if dist < 1000 else random.choice(["rail", "air"])
                comp_routes.append({
                    "id": f"R-{comp_id}-{n1['id']}-{n2['id']}",
                    "from_node": n1["id"],
                    "to_node": n2["id"],
                    "transport_mode": mode,
                    "distance_km": round(dist, 2),
                    "base_transit_time_hrs": round(dist / 80, 1), # Speed approx 80km/h
                    "cost_per_unit": round(dist * 0.15, 2),
                    "risk_factor": 0.02,
                    "company_id": comp_id
                })
        
        # Add random cross-routes
        for _ in range(comp["node_count"]):
            n1, n2 = random.sample(comp_nodes, 2)
            if any(r["from_node"] == n1["id"] and r["to_node"] == n2["id"] for r in comp_routes):
                continue
            dist = random.uniform(500, 3000)
            comp_routes.append({
                "id": f"R-{comp_id}-X-{random.randint(1000, 9999)}",
                "from_node": n1["id"],
                "to_node": n2["id"],
                "transport_mode": random.choice(TRANSPORT_MODES),
                "distance_km": round(dist, 2),
                "base_transit_time_hrs": round(dist / 100, 1),
                "cost_per_unit": round(dist * 0.12, 2),
                "risk_factor": 0.03,
                "company_id": comp_id
            })

        all_routes.extend(comp_routes)
        await db.routes.insert_many(comp_routes)

    # 9. Shipments - Random generation for demo
    shipments = []
    for i in range(1, 101): # 100 shipments
        comp = random.choice(COMPANIES_CONFIG)
        comp_id = comp["id"]
        comp_nodes_list = [n for n in all_nodes if n["company_id"] == comp_id]
        origin, dest = random.sample(comp_nodes_list, 2)
        
        # Simple path
        path = [origin["id"], dest["id"]]
        
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
            "planned_route": path,
            "route_taken": [origin["id"]],
            "company_id": comp_id,
            "customer_id": f"customer_{random.randint(1, 20)}",
            "estimated_arrival": (datetime.now() + timedelta(days=random.randint(3, 12))).isoformat(),
            "departure_time": (datetime.now() - timedelta(days=random.randint(1, 4))).isoformat()
        }
        shipments.append(shipment)
    await db.shipments.insert_many(shipments)

    log.info(f"Database Refresh Complete. {len(all_nodes)} nodes, {len(shipments)} shipments created.")
    return True
