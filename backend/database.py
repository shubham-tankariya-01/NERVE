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
            "MONGO_URL is required when APP_ENV is staging or production."
        )

CLIENT_OPTIONS = {"serverSelectionTimeoutMS": 5000}

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
