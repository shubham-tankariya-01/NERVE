import os
import motor.motor_asyncio
from pymongo import MongoClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

# Async client for FastAPI
async_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
async_db = async_client.nerve_db

# Sync client for migrations and background graph loading
sync_client = MongoClient(MONGO_URL)
sync_db = sync_client.nerve_db

def get_async_db():
    return async_db

def get_sync_db():
    return sync_db
