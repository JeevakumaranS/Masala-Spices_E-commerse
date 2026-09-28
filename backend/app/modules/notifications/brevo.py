"""Brevo transactional email delivery for order updates."""

import html
import logging
from typing import Any, Literal

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import admin_integration_settings_table
from app.modules.notifications.crypto import InvalidToken, decrypt_integration_secret

logger = logging.getLogger(__name__)

EmailDeliveryStatus = Literal["sent", "failed", "disabled"]
OrderEmailStatus = Literal["placed", "processing", "shipped", "delivered"]
_BREVO_TRANSACTIONAL_EMAIL_URL = "https://api.brevo.com/v3/smtp/email"


def _order_confirmation_html(order: dict[str, Any]) -> str:
    customer_name = html.escape(str(order["customer_name"]))
    order_number = html.escape(str(order["order_number"]))
    rows = "".join(
        "<tr>"
        f"<td style=\"padding:8px;border-bottom:1px solid #eee\">{html.escape(str(item['name']))}"
        f"{' — ' + html.escape(str(item['pack_size'])) if item.get('pack_size') else ''}"
        f"</td><td style=\"padding:8px;border-bottom:1px solid #eee;text-align:center\">{int(item['qty'])}</td>"
        f"<td style=\"padding:8px;border-bottom:1px solid #eee;text-align:right\">₹{float(item['line_total']):.2f}</td>"
        "</tr>"
        for item in order["items"]
    )
    shipping_note = (
        f"<p>{html.escape(str(order['shipping_note']))}</p>"
        if order.get("shipping_note")
        else ""
    )
    return (
        "<!doctype html><html><body style=\"font-family:Arial,sans-serif;color:#302016\">"
        f"<h1>Thank you for your order, {customer_name}!</h1>"
        f"<p>We received your order <strong>{order_number}</strong>.</p>"
        "<table style=\"width:100%;border-collapse:collapse\"><thead><tr>"
        "<th style=\"text-align:left;padding:8px\">Item</th>"
        "<th style=\"padding:8px\">Qty</th><th style=\"text-align:right;padding:8px\">Amount</th>"
        f"</tr></thead><tbody>{rows}</tbody></table>"
        f"<p>Subtotal: ₹{float(order['subtotal']):.2f}</p>"
        f"<p>Discount: −₹{float(order['discount_amount']):.2f}</p>"
        f"<p>Shipping: ₹{float(order['shipping_amount']):.2f}</p>"
        f"<p><strong>Total: ₹{float(order['total']):.2f}</strong></p>"
        "<p>Payment has not been collected. Our team will contact you to confirm "
        "payment and dispatch details.</p>"
        f"{shipping_note}"
        "<p>Thank you for shopping with Masala House.</p>"
        "</body></html>"
    )


async def send_order_confirmation_email(
    db: AsyncSession,
    order: dict[str, Any],
) -> EmailDeliveryStatus:
    return await send_order_status_email(db, order, "placed")


def _order_status_email_html(
    order: dict[str, Any],
    status: OrderEmailStatus,
) -> str:
    if status == "placed":
        return _order_confirmation_html(order)

    customer_name = html.escape(str(order["customer_name"]))
    order_number = html.escape(str(order["order_number"]))
    content = {
        "processing": (
            "We have started preparing your order. We’ll email you again when it ships."
        ),
        "shipped": (
            "Your order is on its way. Use the courier and tracking details below to follow its journey."
        ),
        "delivered": (
            "Your order has been marked as delivered. We hope you enjoy your Masala House order."
        ),
    }[status]
    shipment_details = ""
    if status in {"shipped", "delivered"}:
        shipment_details = (
            "<h2>Shipment details</h2><ul>"
            f"<li>Courier: {html.escape(str(order.get('courier_partner') or 'Not provided'))}</li>"
            f"<li>Tracking ID: {html.escape(str(order.get('tracking_id') or 'Not provided'))}</li>"
            "</ul>"
        )
    return (
        "<!doctype html><html><body style=\"font-family:Arial,sans-serif;color:#302016\">"
        f"<h1>Order {html.escape(status.title())}</h1>"
        f"<p>Hello {customer_name},</p>"
        f"<p>{content}</p>"
        f"<p>Order reference: <strong>{order_number}</strong></p>"
        f"<p>Order total: <strong>₹{float(order['total']):.2f}</strong></p>"
        f"{shipment_details}"
        "<p>Thank you for shopping with Masala House.</p>"
        "</body></html>"
    )


async def send_order_status_email(
    db: AsyncSession,
    order: dict[str, Any],
    status: OrderEmailStatus,
) -> EmailDeliveryStatus:
    result = await db.execute(
        select(admin_integration_settings_table).limit(1)
    )
    settings = result.mappings().first()
    if settings is None or not settings["email_enabled"]:
        return "disabled"

    encrypted_api_key = settings["email_api_key_encrypted"]
    sender_name = settings["email_sender_name"]
    sender_email = settings["email_sender_email"]
    if not encrypted_api_key or not sender_name or not sender_email:
        logger.error("Brevo order confirmation is enabled but its configuration is incomplete.")
        return "failed"

    try:
        api_key = decrypt_integration_secret(encrypted_api_key)
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                _BREVO_TRANSACTIONAL_EMAIL_URL,
                headers={"api-key": api_key, "accept": "application/json"},
                json={
                    "sender": {"name": sender_name, "email": sender_email},
                    "to": [{"email": order["email"], "name": order["customer_name"]}],
                    "subject": f"Order {order['order_number']} — {status.title()}",
                    "htmlContent": _order_status_email_html(order, status),
                },
            )
            response.raise_for_status()
    except (httpx.HTTPError, InvalidToken, UnicodeError):
        logger.exception(
            "Brevo failed to send %s notification for order %s.",
            status,
            order["order_number"],
        )
        return "failed"

    logger.info(
        "Brevo sent %s notification for order %s.",
        status,
        order["order_number"],
    )
    return "sent"
