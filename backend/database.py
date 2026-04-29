import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(_env_path)

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "nerve_db")

is_local = "localhost" in MONGO_URL or "127.0.0.1" in MONGO_URL

def _build_client_kwargs():
    base = {
        "serverSelectionTimeoutMS": 10000,
        "connectTimeoutMS": 10000,
        "socketTimeoutMS": 20000,
    }
    if not is_local:
        base.update({
            "tls": True,
            "tlsCAFile": certifi.where(),
            "retryWrites": True,
        })
    return base

# Async client for FastAPI endpoints
async_client = AsyncIOMotorClient(MONGO_URL, **_build_client_kwargs())
async_db = async_client[DB_NAME]

# Sync client for health checks and seed_data
sync_client = MongoClient(MONGO_URL, **_build_client_kwargs())
sync_db = sync_client[DB_NAME]

def get_async_db():
    return async_db

def get_sync_db():
    return sync_db
