import sys
import os
from pathlib import Path

# Add the current directory to sys.path so we can import backend
sys.path.append(str(Path(__file__).resolve().parent.parent))

from backend.database import get_sync_db
from passlib.context import CryptContext
from datetime import datetime, timezone

def seed_specific_users():
    db = get_sync_db()
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Default company for non-admin roles
    company_id = "company_demo"
    
    users_to_create = [
        {
            "username": "jiyaadmin",
            "email": "jiyaadmin@ex.com",
            "password": "password123",
            "role": "logistics_manager",
            "full_name": "Jiya Logistics Manager",
            "company_id": company_id
        },
        {
            "username": "jiyaopr",
            "email": "jiyaopr@ex.com",
            "password": "password123",
            "role": "platform_admin",
            "full_name": "Jiya Platform Admin",
            "company_id": None
        },
        {
            "username": "jiyanod",
            "email": "jiyanod@ex.com",
            "password": "password123",
            "role": "node_operator",
            "full_name": "Jiya Node Operator",
            "company_id": company_id
        },
        {
            "username": "jiyacus4",
            "email": "jiyacus4@ex.com",
            "password": "password123",
            "role": "customer",
            "full_name": "Jiya Customer",
            "company_id": company_id
        }
    ]

    print("Seeding specific users into database...")
    for user_data in users_to_create:
        hashed_pwd = pwd_context.hash(user_data["password"])
        user_doc = {
            "username": user_data["username"],
            "email": user_data["email"],
            "hashed_password": hashed_pwd,
            "role": user_data["role"],
            "company_id": user_data["company_id"],
            "full_name": user_data["full_name"],
            "is_active": True,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc)
        }
        
        # Use update_one with upsert=True to avoid duplicates
        db.users.update_one(
            {"email": user_data["email"]},
            {"$set": user_doc},
            upsert=True
        )
        print(f"User created/updated: {user_data['username']} ({user_data['email']}) with password: {user_data['password']}")

    print("\nAll users seeded successfully!")

if __name__ == "__main__":
    seed_specific_users()
