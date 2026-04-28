import os

import motor.motor_asyncio
from pymongo import MongoClient

APP_ENV = os.getenv("APP_ENV", "production").strip().lower()
MONGO_URL = os.getenv("MONGO_URL", "").strip()
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "nerve_db").strip() or "nerve_db"

if not MONGO_URL:
    if APP_ENV == "development":
        MONGO_URL = "mongodb://localhost:27017"
    else:
        raise RuntimeError(
            "CRITICAL STARTUP ERROR: MONGO_URL is not defined. "
            "Please add your MongoDB connection string to the 'MONGO_URL' "
            "Environment Variable in your hosting dashboard (e.g., Render)."
        )

import certifi
is_local = "localhost" in MONGO_URL or "127.0.0.1" in MONGO_URL
CLIENT_OPTIONS = {
    "serverSelectionTimeoutMS": 5000,
    "tls": not is_local,
    "tlsCAFile": certifi.where() if not is_local else None
}

# Async client for FastAPI
async_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL, **CLIENT_OPTIONS)
async_db = async_client[MONGO_DB_NAME]

# Sync client for graph loading and health checks
sync_client = MongoClient(MONGO_URL, **CLIENT_OPTIONS)
sync_db = sync_client[MONGO_DB_NAME]


def get_async_db():
    return async_db


def get_sync_db():
    return sync_db
