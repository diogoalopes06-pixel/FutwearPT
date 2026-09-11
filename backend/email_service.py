"""Email service using Resend."""
import os
import asyncio
import logging
import resend

logger = logging.getLogger("emails")

resend.api_key = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "noreply@futwearpt.pt")
SENDER_NAME = os.environ.get("SENDER_NAME", "FutWearPT")
SENDER = f"{SENDER_NAME} <{SENDER_EMAIL}>"
SITE_URL = os.environ.get("SITE_URL", "").rstrip("/")


def _tracking_url(order: dict, site_url: str = "") -> str:
    base = (site_url or SITE_URL).rstrip("/")
    if not base:
        return ""
    token = order.get("tracking_token")
    suffix = f"?token={token}" if token else ""
    return f"{base}/encomenda/{order['id']}{suffix}"

LOGO = os.environ.get("EMAIL_LOGO_URL", f"{SITE_URL}/futwearpt-logo-square.png" if SITE_URL else "")


def _format_items(items) -> str:
    rows = ""
    for it in items:
        qty = f"{it['quantity']}{' kg' if it['unit'] == 'kg' else ''}"
        rows += f"""
        <tr>
            <td style="padding:12px 0;border-bottom:1px solid #E8E2D9;color:#2C2724;font-family:Georgia,serif;font-size:15px;">{it['name']} <span style="color:#6B635E;">× {qty}</span></td>
            <td style="padding:12px 0;border-bottom:1px solid #E8E2D9;color:#2C2724;text-align:right;font-family:Georgia,serif;font-size:15px;">€{(it['price'] * it['quantity']):.2f}</td>
        </tr>"""
    return rows


def _wrap(title: str, intro: str, body_html: str, cta_label: str = None, cta_url: str = None) -> str:
    cta = ""
    if cta_label and cta_url:
        cta = f"""
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0;">
            <tr><td style="background:#C1292E;padding:16px 32px;">
                <a href="{cta_url}" style="color:#FDFBF7;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;">{cta_label}</a>
            </td></tr>
        </table>"""

    return f"""<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FDFBF7;font-family:Arial,sans-serif;color:#2C2724;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FDFBF7;padding:40px 16px;">
        <tr><td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E8E2D9;">
                <tr><td style="padding:40px 40px 24px 40px;text-align:center;border-bottom:1px solid #E8E2D9;">
                    <img src="{LOGO}" alt="FutWearPT" width="80" height="80" style="border-radius:4px;display:block;margin:0 auto;">
                    <p style="margin:18px 0 0 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C1292E;">FutWearPT</p>
                </td></tr>
                <tr><td style="padding:40px 40px 32px 40px;">
                    <h1 style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:32px;line-height:1.15;color:#2C2724;font-weight:600;">{title}</h1>
                    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#6B635E;">{intro}</p>
                    {body_html}
                    {cta}
                </td></tr>
                <tr><td style="padding:24px 40px 40px 40px;border-top:1px solid #E8E2D9;background:#F5F2EA;font-size:12px;color:#6B635E;line-height:1.6;">
                    <p style="margin:0 0 8px 0;"><strong style="color:#2C2724;">FutWearPT</strong></p>
                    <p style="margin:0;">FutWearPT · Loja online de camisolas de futebol</p>
                    <p style="margin:0;">+351 241 402 897 · hello@futwearpt.pt</p>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body></html>"""


def _build_order_summary(order) -> str:
    addr = ""
    if order.get("delivery_method") == "delivery" and order.get("address"):
        addr = f"<p style='margin:8px 0 0 0;font-size:13px;color:#6B635E;'><strong style='color:#2C2724;'>Morada:</strong> {order['address']}</p>"
    method = "Entrega ao domicílio" if order.get("delivery_method") == "delivery" else "Levantamento na loja"
    payment = "MBWay manual" if order.get("payment_method") == "mbway" else "Pagamento na entrega/loja"
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px 0;">
        {_format_items(order['items'])}
        <tr>
            <td style="padding-top:12px;color:#6B635E;font-size:13px;">Portes</td>
            <td style="padding-top:12px;color:#6B635E;text-align:right;font-size:13px;">{("Grátis" if order.get("shipping_fee", 0) == 0 else f"€{order.get("shipping_fee", 0):.2f}")}</td>
        </tr>
        <tr>
            <td style="padding-top:20px;font-family:Georgia,serif;font-size:22px;color:#2C2724;">Total</td>
            <td style="padding-top:20px;font-family:Georgia,serif;font-size:22px;color:#C1292E;text-align:right;">€{order['total']:.2f}</td>
        </tr>
    </table>
    <div style="background:#F5F2EA;padding:16px 20px;font-size:13px;color:#6B635E;">
        <p style="margin:0;"><strong style="color:#2C2724;">Modo:</strong> {method}</p>
        <p style="margin:8px 0 0 0;"><strong style="color:#2C2724;">Pagamento:</strong> {payment}</p>
        {addr}
        <p style="margin:8px 0 0 0;"><strong style="color:#2C2724;">Referência:</strong> #{order['id'][:8].upper()}</p>
    </div>
    """


async def send_email(to: str, subject: str, html: str) -> dict:
    if not resend.api_key:
        logger.warning("RESEND_API_KEY not configured — email NOT sent.")
        logger.info("Would send to %s subject %s", to, subject)
        return {"sent": False, "reason": "no_api_key"}
    params = {"from": SENDER, "to": [to], "subject": subject, "html": html}
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info("Email sent to %s id=%s", to, result.get("id"))
        return {"sent": True, "id": result.get("id")}
    except Exception as e:
        logger.exception("Resend error: %s", e)
        return {"sent": False, "reason": str(e)}


async def send_order_confirmation(order: dict, site_url: str = ""):
    if not order.get("email"):
        return {"sent": False, "reason": "no_email"}
    name = order["customer_name"].split(" ")[0]
    track_url = _tracking_url(order, site_url)
    html = _wrap(
        title=f"Obrigado, {name}!",
        intro=f"Recebemos a sua encomenda. Vamos contactá-lo em breve para confirmar detalhes e combinar pagamento.",
        body_html=_build_order_summary(order),
        cta_label="Ver estado da encomenda" if track_url else None,
        cta_url=track_url or None,
    )
    return await send_email(order["email"], f"Encomenda recebida · #{order['id'][:8].upper()}", html)


async def send_admin_new_order(order: dict):
    """Notify the shop admin that a new order was placed."""
    admin_email = os.environ.get("ADMIN_NOTIFICATION_EMAIL") or os.environ.get("ADMIN_EMAIL")
    if not admin_email:
        return {"sent": False, "reason": "no_admin_email"}

    method = "Entrega ao domicílio" if order.get("delivery_method") == "delivery" else "Levantamento na loja"
    payment = "MBWay manual" if order.get("payment_method") == "mbway" else "Pagamento na entrega/loja"
    email_line = f"<p style='margin:4px 0 0 0;'><strong style='color:#2C2724;'>Email:</strong> {order.get('email') or '—'}</p>"
    notes_line = f"<p style='margin:12px 0 0 0;font-style:italic;'>\"{order['notes']}\"</p>" if order.get("notes") else ""
    addr_line = f"<p style='margin:4px 0 0 0;'><strong style='color:#2C2724;'>Morada:</strong> {order['address']}</p>" if order.get("delivery_method") == "delivery" and order.get("address") else ""

    body = f"""
    <div style="background:#F5F2EA;padding:16px 20px;font-size:14px;color:#6B635E;line-height:1.6;margin-bottom:16px;">
        <p style="margin:0;"><strong style="color:#2C2724;">Cliente:</strong> {order['customer_name']}</p>
        <p style="margin:4px 0 0 0;"><strong style="color:#2C2724;">Telemóvel:</strong> <a href="tel:{order['phone']}" style="color:#C1292E;">{order['phone']}</a></p>
        {email_line}
        <p style="margin:4px 0 0 0;"><strong style="color:#2C2724;">Modo:</strong> {method}</p>
        <p style="margin:4px 0 0 0;"><strong style="color:#2C2724;">Pagamento:</strong> {payment}</p>
        {addr_line}
        {notes_line}
    </div>
    {_build_order_summary(order)}
    """

    html = _wrap(
        title="🔔 Nova encomenda recebida",
        intro=f"Um cliente acabou de fazer uma encomenda no site. Entre no painel admin para ver detalhes e atualizar o estado.",
        body_html=body,
    )
    subject = f"Nova encomenda #{order['id'][:8].upper()} · {order['customer_name']} · €{order['total']:.2f}"
    return await send_email(admin_email, subject, html)


async def send_order_ready(order: dict, site_url: str = ""):
    if not order.get("email"):
        return {"sent": False, "reason": "no_email"}
    name = order["customer_name"].split(" ")[0]
    method = "para entrega" if order.get("delivery_method") == "delivery" else "para levantamento na loja"
    track_url = _tracking_url(order, site_url)
    html = _wrap(
        title=f"A sua encomenda está pronta, {name}!",
        intro=f"Boas notícias — a sua encomenda está preparada e já está disponível {method}. Pode levantá-la na nossa loja em horário comercial ou aguardar o nosso contacto para a entrega.",
        body_html=_build_order_summary(order),
        cta_label="Ver estado da encomenda" if track_url else None,
        cta_url=track_url or None,
    )
    return await send_email(order["email"], f"Encomenda pronta · #{order['id'][:8].upper()}", html)

STATUS_LABELS = {
    "pending": "pendente",
    "confirmed": "confirmada",
    "preparing": "em preparação",
    "ready": "pronta",
    "delivered": "entregue",
    "cancelled": "cancelada",
}

STATUS_INTROS = {
    "confirmed": "A sua encomenda foi confirmada pela nossa equipa. Vamos começar a preparar tudo com o cuidado habitual.",
    "preparing": "A sua encomenda já está em preparação. Estamos a tratar dos seus produtos.",
    "ready": "Boas notícias — a sua encomenda está pronta.",
    "delivered": "A sua encomenda foi marcada como entregue. Obrigado pela preferência!",
    "cancelled": "A sua encomenda foi cancelada. Se tiver dúvidas, contacte-nos por telefone ou email.",
}


async def send_order_status_update(order: dict, site_url: str = ""):
    if not order.get("email"):
        return {"sent": False, "reason": "no_email"}
    status = order.get("status", "pending")
    if status not in STATUS_INTROS:
        return {"sent": False, "reason": "status_not_notifiable"}
    name = order.get("customer_name", "Cliente").split(" ")[0]
    label = STATUS_LABELS.get(status, status)
    track_url = _tracking_url(order, site_url)
    html = _wrap(
        title=f"Encomenda {label}, {name}",
        intro=STATUS_INTROS[status],
        body_html=_build_order_summary(order),
        cta_label="Ver estado da encomenda" if track_url else None,
        cta_url=track_url or None,
    )
    return await send_email(order["email"], f"Estado da encomenda: {label} · #{order['id'][:8].upper()}", html)


async def send_payment_confirmed(order: dict, site_url: str = ""):
    if not order.get("email"):
        return {"sent": False, "reason": "no_email"}
    name = order.get("customer_name", "Cliente").split(" ")[0]
    track_url = _tracking_url(order, site_url)
    html = _wrap(
        title=f"Pagamento confirmado, {name}",
        intro="Confirmámos o pagamento da sua encomenda. A nossa equipa vai continuar a preparação.",
        body_html=_build_order_summary(order),
        cta_label="Ver estado da encomenda" if track_url else None,
        cta_url=track_url or None,
    )
    return await send_email(order["email"], f"Pagamento confirmado · #{order['id'][:8].upper()}", html)



async def send_password_reset_email(email: str, token: str, name: str = "Cliente"):
    base = SITE_URL or os.environ.get("FRONTEND_URL", "").rstrip("/")
    reset_url = f"{base}/reset-password?token={token}" if base else f"/reset-password?token={token}"
    first = (name or "Cliente").split(" ")[0]
    html = _wrap(
        title=f"Recuperar password, {first}",
        intro="Recebemos um pedido para recuperar a password da sua conta. Este link é válido durante 1 hora.",
        body_html="<p style='color:#6B635E;font-size:14px;line-height:1.7;'>Se não pediu esta alteração, pode ignorar este email.</p>",
        cta_label="Criar nova password",
        cta_url=reset_url,
    )
    return await send_email(email, "Recuperar password · FutWearPT", html)
