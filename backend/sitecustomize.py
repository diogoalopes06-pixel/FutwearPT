"""Startup helpers for FutWearPT."""
import logging
import os
from datetime import datetime, timezone

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
            result = db.users.update_many({"email": {"$ne": admin_email}}, {"$set": {"role": "customer"}})
        else:
            result = db.users.update_many({"role": {"$exists": False}}, {"$set": {"role": "customer"}})
        if result.modified_count:
            logger.info("Migrated %s legacy user account(s) to customer role", result.modified_count)
        client.close()
except Exception as exc:
    logger.warning("Legacy customer-role migration skipped: %s", exc)

# Register Web Push routes before server.py creates its FastAPI application.
# This keeps the existing server routes untouched while exposing the subscription API.
try:
    from fastapi import FastAPI, HTTPException
    from pywebpush import webpush, WebPushException
    import asyncio
    import json
    import jwt

    _push_public_key = os.environ.get("VAPID_PUBLIC_KEY", "")
    _push_private_key = os.environ.get("VAPID_PRIVATE_KEY", "").replace("\\n", "\n")
    _push_claims = {"sub": os.environ.get("VAPID_CONTACT_EMAIL", "mailto:admin@example.com")}

    async def _push_user(request):
        auth = request.headers.get("authorization", "")
        token = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
        if not token:
            raise HTTPException(status_code=401, detail="Não autenticado")
        try:
            payload = jwt.decode(token, os.environ.get("JWT_SECRET", ""), algorithms=["HS256"])
        except Exception as exc:
            raise HTTPException(status_code=401, detail="Token inválido") from exc
        from server import db
        user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utilizador não encontrado")
        return user

    async def _push_subscribe(request, data: dict, role: str):
        user = await _push_user(request)
        if user.get("role") != role:
            raise HTTPException(status_code=403, detail="Acesso negado")
        subscription = data.get("subscription") if isinstance(data, dict) else None
        if not isinstance(subscription, dict) or not subscription.get("endpoint"):
            raise HTTPException(status_code=400, detail="Subscrição push inválida")
        from server import db
        now = datetime.now(timezone.utc).isoformat()
        await db.push_subscriptions.update_one(
            {"subscription.endpoint": subscription["endpoint"]},
            {"$set": {"user_id": user["id"], "role": role, "subscription": subscription, "updated_at": now}, "$setOnInsert": {"created_at": now}},
            upsert=True,
        )
        return {"ok": True}

    async def _push_unsubscribe(request, data: dict, role: str):
        user = await _push_user(request)
        if user.get("role") != role:
            raise HTTPException(status_code=403, detail="Acesso negado")
        subscription = data.get("subscription") if isinstance(data, dict) else None
        endpoint = subscription.get("endpoint") if isinstance(subscription, dict) else None
        if not endpoint:
            raise HTTPException(status_code=400, detail="Subscrição push inválida")
        from server import db
        await db.push_subscriptions.delete_one({"user_id": user["id"], "role": role, "subscription.endpoint": endpoint})
        return {"ok": True}

    async def _push_test(request, role: str):
        user = await _push_user(request)
        if user.get("role") != role:
            raise HTTPException(status_code=403, detail="Acesso negado")
        from server import db
        subs = await db.push_subscriptions.find({"user_id": user["id"], "role": role}, {"_id": 0}).to_list(50)
        payload = {"title": "🔔 FutWearPT", "body": "As notificações estão ativas neste dispositivo.", "tag": "futwearpt-test", "url": "/conta" if role == "customer" else "/admin"}
        sent = 0
        for item in subs:
            try:
                await asyncio.to_thread(webpush, subscription_info=item["subscription"], data=json.dumps(payload), vapid_private_key=_push_private_key, vapid_claims=_push_claims, ttl=86400)
                sent += 1
            except WebPushException as exc:
                if exc.response is not None and exc.response.status_code in (404, 410):
                    await db.push_subscriptions.delete_one({"_id": item.get("_id")})
        return {"ok": True, "sent": sent}

    if not getattr(FastAPI, "_futwear_push_routes", False):
        _orig_fastapi_init = FastAPI.__init__
        def _fastapi_init(self, *args, **kwargs):
            _orig_fastapi_init(self, *args, **kwargs)
            self.add_api_route("/api/push/vapid-public-key", lambda: {"key": _push_public_key}, methods=["GET"])
            self.add_api_route("/api/customers/push/subscribe", lambda request, data: _push_subscribe(request, data, "customer"), methods=["POST"])
            self.add_api_route("/api/customers/push/unsubscribe", lambda request, data: _push_unsubscribe(request, data, "customer"), methods=["POST"])
            self.add_api_route("/api/customers/push/test", lambda request: _push_test(request, "customer"), methods=["POST"])
            self.add_api_route("/api/admin/push/subscribe", lambda request, data: _push_subscribe(request, data, "admin"), methods=["POST"])
            self.add_api_route("/api/admin/push/unsubscribe", lambda request, data: _push_unsubscribe(request, data, "admin"), methods=["POST"])
            self.add_api_route("/api/admin/push/test", lambda request: _push_test(request, "admin"), methods=["POST"])
        FastAPI.__init__ = _fastapi_init
        FastAPI._futwear_push_routes = True
except Exception as exc:
    logger.warning("Web Push route registration skipped: %s", exc)
