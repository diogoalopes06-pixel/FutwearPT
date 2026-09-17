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
# Keep the existing server routes untouched while exposing reliable subscription endpoints.
try:
    from fastapi import FastAPI, HTTPException, Request, Body
    from pywebpush import webpush, WebPushException
    import asyncio
    import json
    import jwt

    _push_public_key = os.environ.get("VAPID_PUBLIC_KEY", "")
    _push_private_key = os.environ.get("VAPID_PRIVATE_KEY", "").replace("\\n", "\n")
    _push_claims = {"sub": os.environ.get("VAPID_CONTACT_EMAIL", "mailto:admin@example.com")}

    async def _push_user(request: Request):
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

    async def _push_subscribe(request: Request, data: dict, role: str):
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
            {
                "$set": {
                    "user_id": user["id"],
                    "role": role,
                    "subscription": subscription,
                    "updated_at": now,
                },
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
        return {"ok": True}

    async def _push_unsubscribe(request: Request, data: dict, role: str):
        user = await _push_user(request)
        if user.get("role") != role:
            raise HTTPException(status_code=403, detail="Acesso negado")
        subscription = data.get("subscription") if isinstance(data, dict) else None
        endpoint = subscription.get("endpoint") if isinstance(subscription, dict) else None
        if not endpoint:
            raise HTTPException(status_code=400, detail="Subscrição push inválida")
        from server import db
        await db.push_subscriptions.delete_one(
            {"user_id": user["id"], "role": role, "subscription.endpoint": endpoint}
        )
        return {"ok": True}

    async def _push_test(request: Request, role: str):
        user = await _push_user(request)
        if user.get("role") != role:
            raise HTTPException(status_code=403, detail="Acesso negado")
        from server import db
        subs = await db.push_subscriptions.find(
            {"user_id": user["id"], "role": role}, {"_id": 0}
        ).to_list(50)
        payload = {
            "title": "🔔 FutWearPT",
            "body": "As notificações estão ativas neste dispositivo.",
            "tag": "futwearpt-test",
            "url": "/conta" if role == "customer" else "/admin",
        }
        sent = 0
        for item in subs:
            try:
                await asyncio.to_thread(
                    webpush,
                    subscription_info=item["subscription"],
                    data=json.dumps(payload),
                    vapid_private_key=_push_private_key,
                    vapid_claims=_push_claims,
                    ttl=86400,
                )
                sent += 1
            except WebPushException as exc:
                if exc.response is not None and exc.response.status_code in (404, 410):
                    await db.push_subscriptions.delete_one({"_id": item.get("_id")})
        return {"ok": True, "sent": sent}

    if not getattr(FastAPI, "_futwear_push_routes", False):
        _orig_fastapi_init = FastAPI.__init__

        def _fastapi_init(self, *args, **kwargs):
            _orig_fastapi_init(self, *args, **kwargs)

            async def vapid_public_key():
                return {"key": _push_public_key}

            async def customer_subscribe(request: Request, data: dict = Body(...)):
                return await _push_subscribe(request, data, "customer")

            async def customer_unsubscribe(request: Request, data: dict = Body(...)):
                return await _push_unsubscribe(request, data, "customer")

            async def customer_test(request: Request):
                return await _push_test(request, "customer")

            async def admin_subscribe(request: Request, data: dict = Body(...)):
                return await _push_subscribe(request, data, "admin")

            async def admin_unsubscribe(request: Request, data: dict = Body(...)):
                return await _push_unsubscribe(request, data, "admin")

            async def admin_test(request: Request):
                return await _push_test(request, "admin")

            self.add_api_route("/api/push/vapid-public-key", vapid_public_key, methods=["GET"])
            self.add_api_route("/api/customers/push/subscribe", customer_subscribe, methods=["POST"])
            self.add_api_route("/api/customers/push/unsubscribe", customer_unsubscribe, methods=["POST"])
            self.add_api_route("/api/customers/push/test", customer_test, methods=["POST"])
            self.add_api_route("/api/admin/push/subscribe", admin_subscribe, methods=["POST"])
            self.add_api_route("/api/admin/push/unsubscribe", admin_unsubscribe, methods=["POST"])
            self.add_api_route("/api/admin/push/test", admin_test, methods=["POST"])

        FastAPI.__init__ = _fastapi_init
        FastAPI._futwear_push_routes = True
except Exception as exc:
    logger.warning("Web Push route registration skipped: %s", exc)

# Patch notification fan-out before server.py imports the functions. New-order pushes
# are delivered to the shop admins and, when the order belongs to an account, the customer.
try:
    import push_service as _fw_push_service

    _original_send_push_to_all = _fw_push_service.send_push_to_all

    async def _send_push_to_all_with_customer(db, payload: dict):
        if payload.get("title") == "🍎 Nova encomenda recebida":
            payload = {**payload, "title": "🔔 Nova encomenda recebida"}

        result = await _original_send_push_to_all(db, payload)

        if payload.get("tag", "").startswith("order-") and payload.get("order_id"):
            try:
                order = await db.orders.find_one({"id": payload["order_id"]}, {"_id": 0, "email": 1})
                email = (order or {}).get("email", "").lower().strip()
                if email:
                    customer = await db.users.find_one({"email": email, "role": "customer"}, {"_id": 0, "id": 1})
                    if customer:
                        await _fw_push_service.send_push_to_user(
                            db,
                            customer["id"],
                            {
                                "title": "🔔 Encomenda recebida",
                                "body": f"A encomenda #{payload['order_id'][:8].upper()} foi registada.",
                                "tag": f"customer-new-order-{payload['order_id']}",
                                "url": f"/encomenda/{payload['order_id']}",
                                "order_id": payload["order_id"],
                            },
                        )
            except Exception:
                logger.exception("Customer new-order push failed")

        return result

    _fw_push_service.send_push_to_all = _send_push_to_all_with_customer
except Exception as exc:
    logger.warning("Customer new-order push patch skipped: %s", exc)

# Ensure status/payment emails also reach the shop admin, while retaining the customer email.
try:
    import email_service as _fw_email_service

    _original_status_email = _fw_email_service.send_order_status_update
    _original_payment_email = _fw_email_service.send_payment_confirmed

    async def _send_admin_copy(order: dict, subject: str, intro: str, site_url: str = ""):
        admin_email = os.environ.get("ADMIN_NOTIFICATION_EMAIL") or os.environ.get("ADMIN_EMAIL")
        if not admin_email:
            return {"sent": False, "reason": "no_admin_email"}
        track_url = _fw_email_service._tracking_url(order, site_url)
        html = _fw_email_service._wrap(
            title=subject,
            intro=intro,
            body_html=_fw_email_service._build_order_summary(order),
            cta_label="Ver no painel admin",
            cta_url=(site_url.rstrip("/") + "/admin" if site_url else None),
        )
        return await _fw_email_service.send_email(admin_email, subject, html)

    async def _status_email_both(order: dict, site_url: str = ""):
        customer_result = await _original_status_email(order, site_url)
        status = order.get("status", "pending")
        labels = _fw_email_service.STATUS_LABELS
        intro = _fw_email_service.STATUS_INTROS.get(status, "O estado da sua encomenda foi atualizado.")
        label = labels.get(status, status)
        admin_result = await _send_admin_copy(
            order,
            f"Estado da encomenda: {label} · #{order['id'][:8].upper()}",
            intro,
            site_url,
        )
        return {"customer": customer_result, "admin": admin_result}

    async def _payment_email_both(order: dict, site_url: str = ""):
        customer_result = await _original_payment_email(order, site_url)
        admin_result = await _send_admin_copy(
            order,
            f"Pagamento confirmado · #{order['id'][:8].upper()}",
            "O pagamento desta encomenda foi confirmado.",
            site_url,
        )
        return {"customer": customer_result, "admin": admin_result}

    _fw_email_service.send_order_status_update = _status_email_both
    _fw_email_service.send_payment_confirmed = _payment_email_both
except Exception as exc:
    logger.warning("Admin notification email patch skipped: %s", exc)
