import asyncio
import os
import sys
from dotenv import load_dotenv

# Add the project root to sys.path so we can import backend
sys.path.append(os.getcwd())

# Load .env from backend folder
load_dotenv("backend/.env")

from backend.database import async_db
from backend.utils.demo_restore import restore_demo_data

async def main():
    print(f"Connecting to: {os.getenv('MONGO_URL')}")
    print("Starting database refresh...")
    try:
        success = await restore_demo_data(async_db)
        if success:
            print("Database refresh successful!")
        else:
            print("Database refresh failed.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
