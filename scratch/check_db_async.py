import asyncio
from backend.database import get_async_db

async def check():
    db = get_async_db()
    comps = await db.companies.find({}).to_list(length=None)
    print("ASYNC COMPANIES:")
    for c in comps:
        print(f" - ID: {c.get('id')}, Name: {c.get('name')}")
    
    target = "apex_log"
    found = await db.companies.find_one({"id": target})
    print(f"\nSearching for '{target}': {found is not None}")
    if found:
        print(f"Data: {found}")

if __name__ == "__main__":
    asyncio.run(check())
