"Web Push notifications via VAPID."""
import os
import json
import logging
import asyncio
from pywebpush import webpush, WebPushException

logger = logging.getLogger("push")

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "").replace("\\n", "\n")
VAPID_CLAIMS = {"sub": os.environ.get("VAPID_CONTACT_EMAIL", "mailto:admin@example.com")}


def _send_one(subscription: dict, payload: dict) -> dict:
    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=dict(VAPID_CLAIMS),
            ttl=60 * 60 * 24,
        )
        return {"ok": True}
    except WebPushException as e:
        status = e.response.status_code if e.response is not None else None
        logger.warning("WebPush error status=%s: %s", status, e)
        return {"ok": False, "status": status, "expired": status in (404, 410)}
    except Exception as e:
        logger.exception("WebPush unexpected: %s", e)
        return {"ok": False, "expired": False}


async def _send_to_subscriptions(db, subs: list, payload: dict):
    if not VAPID_PRIVATE_KEY:
        logger.warning("VAPID keys not configured — skipping push.")
        return {"sent": 0, "reason": "no_vapid_private_key"}

    if not subs:
        return {"sent": 0}

    results = await asyncio.gather(
        *(asyncio.to_thread(_send_one, s["subscription"], payload) for s in subs)
    )

    sent = 0
    expired_endpoints = []
    for s, r in zip(subs, results):
        if r.get("ok"):
            sent += 1
        elif r.get("expired"):
            expired_endpoints.append(s["subscription"]["endpoint"])

    if expired_endpoints:
        await db.push_subscriptions.delete_many(
            {"subscription.endpoint": {"$in": expired_endpoints}}
        )

    logger.info("Push: sent=%d, expired_removed=%d", sent, len(expired_endpoints))
    return {"sent": sent, "expired_removed": len(expired_endpoints)}


async def send_push_to_all(db, payload: dict):
    """Send a push notification to all admin subscriptions.

    Legacy subscriptions without role are treated as admin subscriptions.
    """
    subs = await db.push_subscriptions.find(
        {"$or": [{"role": "admin"}, {"role": {"$exists": False}}]},
        {"_id": 0},
    ).to_list(1000)
    return await _send_to_subscriptions(db, subs, payload)


async def send_push_to_user(db, user_id: str, payload: dict):
    """Send push notification to one authenticated customer/user."""
    subs = await db.push_subscriptions.find(
        {"user_id": user_id, "role": "customer"},
        {"_id": 0},
    ).to_list(50)
    return await _send_to_subscriptions(db, subs, payload)
