"""One-time startup migration for legacy FutWearPT customer accounts.

Python imports sitecustomize automatically when this directory is on sys.path.
This keeps the migration independent from the main FastAPI module so existing
application code is not rewritten just to repair legacy user roles.
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

        # Preserve the configured administrator. Every other existing account
        # is a customer account. This repairs accounts created before the role
        # field was introduced, while never changing the admin credentials.
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
    # Never prevent the API from starting because of a migration helper.
    logger.warning("Legacy customer-role migration skipped: %s", exc)
