"""Brevo transactional email delivery for order updates."""

import html
import logging
from typing import Any, Literal

import httpx
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import session_factory
from app.modules.notifications.settings import get_notification_settings

logger = logging.getLogger(__name__)

EmailDeliveryStatus = Literal["sent", "failed", "disabled"]
OrderEmailStatus = Literal["placed", "processing", "shipped", "delivered"]
NewsletterEmailStatus = Literal["sent", "failed", "disabled"]
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
    order: dict[str, Any],
) -> EmailDeliveryStatus:
    return await send_order_status_email(order, "placed")


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
    order: dict[str, Any],
    status: OrderEmailStatus,
) -> EmailDeliveryStatus:
    customer_name = order.get("customer_name") or ""
    return await _send_transactional_email(
        recipient=str(order["email"]),
        recipient_name=str(customer_name),
        subject=f"Order {order['order_number']} — {status.title()}",
        html_content=_order_status_email_html(order, status),
        description=f"{status} notification for order {order['order_number']}",
    )


def _newsletter_signup_html() -> str:
    return (
        "<!doctype html><html><body style=\"font-family:Arial,sans-serif;color:#302016\">"
        "<h1>You’re on the Masala House list!</h1>"
        "<p>Thanks for joining us. Look out for our weekly recipe and spice updates, "
        "sent every Tuesday.</p>"
        "<p>No spam — just what we ground this week and how to cook with it.</p>"
        "<p>Thanks,<br />The Masala House kitchen</p>"
        "</body></html>"
    )


def _brevo_error_details(
    response: httpx.Response,
    *,
    recipient: str,
    sender_email: str,
) -> tuple[str, str]:
    try:
        payload = response.json()
    except ValueError:
        return "", ""

    if not isinstance(payload, dict):
        return "", ""

    code = payload.get("code")
    message = payload.get("message")
    safe_code = code[:100] if isinstance(code, str) else ""
    safe_message = message[:1000] if isinstance(message, str) else ""
    for address in {recipient, sender_email}:
        if address:
            safe_message = safe_message.replace(address, "[redacted]")
    return safe_code, safe_message


async def send_newsletter_signup_email(
    email: str,
) -> NewsletterEmailStatus:
    return await _send_transactional_email(
        recipient=email,
        recipient_name="Newsletter subscriber",
        subject="You’re on the Masala House list",
        html_content=_newsletter_signup_html(),
        description="newsletter signup confirmation",
    )


async def _send_transactional_email(
    *,
    recipient: str,
    recipient_name: str,
    subject: str,
    html_content: str,
    description: str,
) -> EmailDeliveryStatus:
    try:
        async with session_factory() as db:
            settings = await get_notification_settings(db)
    except SQLAlchemyError:
        logger.exception("Brevo %s could not load notification settings.", description)
        return "failed"
    if not settings.email_enabled:
        logger.warning(
            "Brevo %s was not attempted because email integration is disabled.",
            description,
        )
        return "disabled"

    api_key = settings.email_api_key
    sender_name = settings.email_sender_name
    sender_email = settings.email_sender_email
    if not api_key or not sender_name or not sender_email:
        logger.error(
            "Brevo %s was not attempted because its configuration is incomplete "
            "(api_key=%s, sender_name=%s, sender_email=%s).",
            description,
            bool(api_key),
            bool(sender_name),
            bool(sender_email),
        )
        return "failed"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            logger.info("Sending %s request to Brevo.", description)
            response = await client.post(
                _BREVO_TRANSACTIONAL_EMAIL_URL,
                headers={"api-key": api_key, "accept": "application/json"},
                json={
                    "sender": {"name": sender_name, "email": sender_email},
                    "to": [{
                        "email": recipient,
                        "name": recipient_name or "Customer",
                    }],
                    "subject": subject,
                    "htmlContent": html_content,
                },
            )
            if response.is_error:
                error_code, error_message = _brevo_error_details(
                    response,
                    recipient=recipient,
                    sender_email=sender_email,
                )
                logger.error(
                    "Brevo rejected %s with HTTP %s (code=%s): %s",
                    description,
                    response.status_code,
                    error_code or "unknown",
                    error_message or "No error message returned.",
                )
                response.raise_for_status()
    except httpx.HTTPError:
        logger.exception(
            "Brevo request failed for %s before a successful response.",
            description,
        )
        return "failed"

    logger.info("Brevo sent %s.", description)
    return "sent"
