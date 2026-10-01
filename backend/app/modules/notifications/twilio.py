"""Twilio SMS delivery for order confirmations."""

import logging
import re
from typing import Any, Literal

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import notification_settings_table

logger = logging.getLogger(__name__)

SmsDeliveryStatus = Literal["sent", "failed", "disabled"]
_TWILIO_MESSAGES_URL = "https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"


def _order_confirmation_body(order: dict[str, Any]) -> str:
    item_lines = [
        f"{item['name']} ({item.get('pack_size') or 'Standard'}) x{int(item['qty'])}"
        for item in order["items"]
    ]
    items = "; ".join(item_lines)
    if len(items) > 250:
        items = items[:247].rsplit(";", 1)[0] + "..."
    return (
        f"Masala House: Order {order['order_number']} received. "
        f"Items: {items}. Total: INR {float(order['total']):.2f}. "
        "Payment is pending; our team will contact you to confirm."
    )


async def send_order_confirmation_sms(
    db: AsyncSession,
    order: dict[str, Any],
) -> SmsDeliveryStatus:
    result = await db.execute(
        select(notification_settings_table).limit(1)
    )
    settings = result.mappings().first()
    if settings is None or not settings["sms_enabled"]:
        return "disabled"

    auth_token = settings["sms_api_key"]
    account_sid = settings["sms_account_sid"]
    sender_phone = settings["sms_sender_phone"]
    if not auth_token or not account_sid or not sender_phone:
        logger.error("Twilio order confirmation is enabled but its configuration is incomplete.")
        return "failed"
    if not re.fullmatch(r"\+[1-9]\d{7,14}", str(order.get("phone") or "")):
        logger.error(
            "Twilio cannot send order confirmation for order %s because the customer phone is not in E.164 format.",
            order["order_number"],
        )
        return "failed"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                _TWILIO_MESSAGES_URL.format(account_sid=account_sid),
                auth=(account_sid, auth_token),
                data={
                    "To": order["phone"],
                    "From": sender_phone,
                    "Body": _order_confirmation_body(order),
                },
            )
            response.raise_for_status()
    except httpx.HTTPError:
        logger.exception(
            "Twilio failed to send order confirmation for order %s.",
            order["order_number"],
        )
        return "failed"

    logger.info("Twilio sent order confirmation for order %s.", order["order_number"])
    return "sent"
