import asyncio
from backend.database import get_sync_db
from backend.utils.demo_restore import restore_demo_data

async def main():
    db = get_sync_db()
    # Convert sync db to motor async if possible, or just use the sync one if restore_demo_data is sync
    # Wait, restore_demo_data is async in the file I saw.
    from motor.motor_asyncio import AsyncIOMotorClient
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    client = AsyncIOMotorClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017"))
    db = client.get_database("nerve")
    await restore_demo_data(db)
    print("Demo data restored successfully with high-connectivity paths.")

if __name__ == "__main__":
    asyncio.run(main())
