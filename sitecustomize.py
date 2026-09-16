"""Startup migration for legacy FutWearPT customer accounts.

Kept at repository root as well as backend/sitecustomize.py so the migration
runs regardless of whether Render starts Python from the repo root or backend.
"""
import logging
import os

logger = logging.getLogger("futwearpt.legacy_users")

try:
    from pymongo import MongoClient

    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    admin_email = os.environ.get("ADMIN_EMAIL", "").lower().strip()

    if mongo_url and db_name:
        client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
        db = client[db_name]
        if admin_email:
            result = db.users.update_many(
                {"email": {"$ne": admin_email}},
                {"$set": {"role": "customer"}},
            )
        else:
            result = db.users.update_many(
                {"role": {"$exists": False}},
                {"$set": {"role": "customer"}},
            )
        if result.modified_count:
            logger.info("Migrated %s legacy user account(s) to customer role", result.modified_count)
        client.close()
except Exception as exc:
    logger.warning("Legacy customer-role migration skipped: %s", exc)
