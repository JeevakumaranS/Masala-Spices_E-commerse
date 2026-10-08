"""Transactional email delivery for order updates and newsletter signups."""

import html
import logging
from typing import Any, Literal

import httpx
from sqlalchemy.exc import SQLAlchemyError

from email_service import EmailServiceNotConfigured, send_email
from app.core.database import session_factory
from app.modules.notifications.settings import get_notification_settings

logger = logging.getLogger(__name__)

EmailDeliveryStatus = Literal["sent", "failed", "disabled"]
OrderEmailStatus = Literal["placed", "processing", "shipped", "delivered"]
NewsletterEmailStatus = Literal["sent", "failed", "disabled"]


# ---------------------------------------------------------------------------
# Shared email layout
# ---------------------------------------------------------------------------

def _email_shell(
    *,
    title: str,
    preheader: str,
    content: str,
) -> str:
    """Build the shared responsive Masala House email layout."""

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>{html.escape(title)}</title>

  <style>
    body {{
      margin: 0;
      padding: 0;
      background: #f7f3ed;
      color: #302016;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Helvetica,
        Arial,
        sans-serif;
    }}

    table {{
      border-spacing: 0;
    }}

    img {{
      border: 0;
      max-width: 100%;
    }}

    .email-wrapper {{
      width: 100%;
      background: #f7f3ed;
      padding: 32px 16px;
    }}

    .email-container {{
      width: 100%;
      max-width: 620px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(48, 32, 22, 0.08);
    }}

    .header {{
      padding: 28px 32px;
      background: #fffaf2;
      border-bottom: 1px solid #eee4d8;
    }}

    .brand {{
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #8f2f20;
    }}

    .brand-subtitle {{
      margin-top: 4px;
      color: #8b776a;
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }}

    .content {{
      padding: 36px 32px;
    }}

    .eyebrow {{
      margin: 0 0 8px;
      color: #b05a35;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }}

    h1 {{
      margin: 0;
      color: #302016;
      font-size: 28px;
      line-height: 1.25;
      letter-spacing: -0.6px;
    }}

    .intro {{
      margin: 14px 0 0;
      color: #6e5b50;
      font-size: 15px;
      line-height: 1.7;
    }}

    .status {{
      display: inline-block;
      margin: 24px 0;
      padding: 8px 14px;
      border-radius: 999px;
      background: #fff0df;
      color: #9a4527;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }}

    .order-card {{
      margin-top: 28px;
      border: 1px solid #eee4d8;
      border-radius: 14px;
      overflow: hidden;
    }}

    .order-card-header {{
      padding: 16px 18px;
      background: #fffaf5;
      border-bottom: 1px solid #eee4d8;
    }}

    .order-label {{
      color: #8b776a;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }}

    .order-number {{
      margin-top: 4px;
      color: #302016;
      font-size: 15px;
      font-weight: 700;
    }}

    .items {{
      width: 100%;
      border-collapse: collapse;
    }}

    .items th {{
      padding: 12px 16px;
      color: #8b776a;
      background: #ffffff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #eee4d8;
    }}

    .items td {{
      padding: 14px 16px;
      color: #403128;
      font-size: 14px;
      border-bottom: 1px solid #f1ebe4;
    }}

    .items tr:last-child td {{
      border-bottom: 0;
    }}

    .qty {{
      text-align: center;
      white-space: nowrap;
    }}

    .amount {{
      text-align: right;
      white-space: nowrap;
      font-weight: 600;
    }}

    .summary {{
      margin-top: 18px;
      padding: 18px;
      border-radius: 14px;
      background: #fffaf5;
    }}

    .summary-row {{
      padding: 5px 0;
      color: #6e5b50;
      font-size: 14px;
    }}

    .summary-total {{
      margin-top: 10px;
      padding-top: 14px;
      border-top: 1px solid #eadfd3;
      color: #302016;
      font-size: 19px;
      font-weight: 800;
    }}

    .info-box {{
      margin-top: 22px;
      padding: 16px 18px;
      border-radius: 12px;
      background: #f8f4ee;
      color: #6e5b50;
      font-size: 13px;
      line-height: 1.6;
    }}

    .shipment {{
      margin-top: 22px;
      padding: 20px;
      border-radius: 14px;
      background: #fff7ed;
      border: 1px solid #f1dfc9;
    }}

    .shipment-title {{
      margin: 0 0 12px;
      color: #302016;
      font-size: 15px;
      font-weight: 700;
    }}

    .shipment-row {{
      padding: 5px 0;
      color: #6e5b50;
      font-size: 13px;
    }}

    .footer {{
      padding: 24px 32px 30px;
      background: #fffaf5;
      border-top: 1px solid #eee4d8;
      text-align: center;
    }}

    .footer-brand {{
      color: #8f2f20;
      font-size: 15px;
      font-weight: 800;
    }}

    .footer-text {{
      margin: 8px 0 0;
      color: #9a877b;
      font-size: 12px;
      line-height: 1.6;
    }}

    @media only screen and (max-width: 600px) {{
      .email-wrapper {{
        padding: 12px 8px;
      }}

      .header {{
        padding: 24px 20px;
      }}

      .content {{
        padding: 28px 20px;
      }}

      .footer {{
        padding: 22px 20px 26px;
      }}

      h1 {{
        font-size: 24px;
      }}

      .items th,
      .items td {{
        padding: 11px 10px;
      }}
    }}
  </style>
</head>

<body>

  <!-- Email preheader -->
  <div style="
    display:none;
    max-height:0;
    overflow:hidden;
    opacity:0;
  ">
    {html.escape(preheader)}
  </div>

  <table role="presentation" width="100%" class="email-wrapper">
    <tr>
      <td align="center">

        <table role="presentation" class="email-container">

          <!-- Header -->
          <tr>
            <td class="header">
              <div class="brand">Masala House</div>

              <div class="brand-subtitle">
                Freshly ground · Full of flavour
              </div>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td class="content">
              {content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer">

              <div class="footer-brand">
                Masala House
              </div>

              <div class="footer-text">
                Crafted for everyday cooking.<br>
                Thank you for choosing us.
              </div>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
"""


# ---------------------------------------------------------------------------
# Order confirmation
# ---------------------------------------------------------------------------

def _order_confirmation_html(order: dict[str, Any]) -> str:
    customer_name = html.escape(str(order["customer_name"]))
    order_number = html.escape(str(order["order_number"]))

    rows = "".join(
        f"""
        <tr>

          <td>
            <strong>
              {html.escape(str(item["name"]))}
            </strong>

            {
                f'''
                <br>
                <span style="color:#9a877b;font-size:12px">
                  {html.escape(str(item["pack_size"]))}
                </span>
                '''
                if item.get("pack_size")
                else ""
            }
          </td>

          <td class="qty">
            {int(item["qty"])}
          </td>

          <td class="amount">
            ₹{float(item["line_total"]):.2f}
          </td>

        </tr>
        """
        for item in order["items"]
    )

    shipping_note = (
        f"""
        <div class="info-box">

          <strong>
            Delivery note
          </strong>

          <br>

          {html.escape(str(order["shipping_note"]))}

        </div>
        """
        if order.get("shipping_note")
        else ""
    )

    content = f"""
      <p class="eyebrow">
        Order confirmed
      </p>

      <h1>
        Thank you, {customer_name}!
      </h1>

      <p class="intro">
        We've received your order and our team will
        take care of the next steps.
      </p>

      <span class="status">
        Order placed
      </span>

      <!-- Order information -->

      <div class="order-card">

        <div class="order-card-header">

          <div class="order-label">
            Order reference
          </div>

          <div class="order-number">
            {order_number}
          </div>

        </div>

        <table class="items">

          <thead>
            <tr>

              <th style="text-align:left">
                Item
              </th>

              <th>
                Qty
              </th>

              <th style="text-align:right">
                Amount
              </th>

            </tr>
          </thead>

          <tbody>
            {rows}
          </tbody>

        </table>

      </div>

      <!-- Price summary -->

      <div class="summary">

        <div class="summary-row">

          <table width="100%">
            <tr>

              <td>
                Subtotal
              </td>

              <td align="right">
                ₹{float(order["subtotal"]):.2f}
              </td>

            </tr>
          </table>

        </div>

        <div class="summary-row">

          <table width="100%">
            <tr>

              <td>
                Discount
              </td>

              <td align="right">
                −₹{float(order["discount_amount"]):.2f}
              </td>

            </tr>
          </table>

        </div>

        <div class="summary-row">

          <table width="100%">
            <tr>

              <td>
                Shipping
              </td>

              <td align="right">
                ₹{float(order["shipping_amount"]):.2f}
              </td>

            </tr>
          </table>

        </div>

        <div class="summary-total">

          <table width="100%">
            <tr>

              <td>
                Total
              </td>

              <td align="right">
                ₹{float(order["total"]):.2f}
              </td>

            </tr>
          </table>

        </div>

      </div>

      <!-- Payment information -->

      <div class="info-box">

        <strong>
          Payment & dispatch
        </strong>

        <br>

        Payment has not been collected yet.
        Our team will contact you to confirm
        payment and dispatch details.

      </div>

      {shipping_note}
    """

    return _email_shell(
        title=f"Order {order_number} — Masala House",
        preheader=(
            f"Your Masala House order {order_number} "
            "has been received."
        ),
        content=content,
    )


# ---------------------------------------------------------------------------
# Order status email
# ---------------------------------------------------------------------------

def _order_status_email_html(
    order: dict[str, Any],
    status: OrderEmailStatus,
) -> str:

    if status == "placed":
        return _order_confirmation_html(order)

    customer_name = html.escape(
        str(order["customer_name"])
    )

    order_number = html.escape(
        str(order["order_number"])
    )

    status_content = {
        "processing": (
            "We've started preparing your order. "
            "We'll let you know as soon as it ships."
        ),

        "shipped": (
            "Your order is on its way! "
            "You can use the shipment details below "
            "to follow its journey."
        ),

        "delivered": (
            "Your order has been marked as delivered. "
            "We hope you enjoy your Masala House favourites."
        ),
    }[status]

    shipment_details = ""

    if status in {"shipped", "delivered"}:

        courier = html.escape(
            str(
                order.get("courier_partner")
                or "Not provided"
            )
        )

        tracking = html.escape(
            str(
                order.get("tracking_id")
                or "Not provided"
            )
        )

        shipment_details = f"""
        <div class="shipment">

          <p class="shipment-title">
            Shipment details
          </p>

          <div class="shipment-row">
            <strong>Courier:</strong>
            {courier}
          </div>

          <div class="shipment-row">
            <strong>Tracking ID:</strong>
            {tracking}
          </div>

        </div>
        """

    content = f"""
      <p class="eyebrow">
        Order update
      </p>

      <h1>
        Your order is {html.escape(status)}
      </h1>

      <p class="intro">

        Hello {customer_name},

        <br><br>

        {status_content}

      </p>

      <span class="status">
        {html.escape(status)}
      </span>

      <!-- Order summary -->

      <div class="order-card">

        <div class="order-card-header">

          <div class="order-label">
            Order reference
          </div>

          <div class="order-number">
            {order_number}
          </div>

        </div>

        <div style="padding:20px">

          <table width="100%">
            <tr>

              <td style="
                color:#8b776a;
                font-size:13px;
              ">
                Order total
              </td>

              <td
                align="right"
                style="
                  color:#302016;
                  font-size:18px;
                  font-weight:800;
                "
              >
                ₹{float(order["total"]):.2f}
              </td>

            </tr>
          </table>

        </div>

      </div>

      {shipment_details}
    """

    return _email_shell(
        title=(
            f"Order {order_number} — "
            f"{status.title()}"
        ),
        preheader=(
            f"Your Masala House order "
            f"{order_number} is {status}."
        ),
        content=content,
    )


# ---------------------------------------------------------------------------
# Public order email functions
# ---------------------------------------------------------------------------

async def send_order_confirmation_email(
    order: dict[str, Any],
) -> EmailDeliveryStatus:

    return await send_order_status_email(
        order,
        "placed",
    )


async def send_order_status_email(
    order: dict[str, Any],
    status: OrderEmailStatus,
) -> EmailDeliveryStatus:
    if status == "placed":
        subject = "Order confirmation — Masala House"
        html_content = _order_confirmation_html(order)
        description = f"order confirmation for order {order['order_number']}"
    else:
        subject = f"Order {order['order_number']} — {status.title()}"
        html_content = _order_status_email_html(order, status)
        description = f"{status} notification for order {order['order_number']}"

    return await _send_transactional_email(
        recipient=str(order["email"]),
        subject=subject,
        html_content=html_content,
        description=description,
    )


# ---------------------------------------------------------------------------
# Newsletter email
# ---------------------------------------------------------------------------

def _newsletter_signup_html() -> str:

    content = """
      <p class="eyebrow">
        Welcome to Masala House
      </p>

      <h1>
        You’re on the list! 🌶️
      </h1>

      <p class="intro">

        Thanks for joining us.

        We'll bring you recipes,
        spice tips, cooking inspiration,
        and what's fresh from our kitchen.

      </p>

      <div class="info-box">

        <strong>
          Every Tuesday
        </strong>

        <br>

        Look out for our weekly recipe
        and spice updates.

        <br><br>

        No spam — just useful cooking inspiration.

      </div>

      <p style="
        margin-top:28px;
        color:#6e5b50;
        font-size:14px;
        line-height:1.7;
      ">

        Thanks for being part of
        the Masala House kitchen.

      </p>
    """

    return _email_shell(
        title="Welcome to Masala House",
        preheader=(
            "You're on the Masala House "
            "newsletter list!"
        ),
        content=content,
    )


async def send_newsletter_signup_email(
    email: str,
) -> NewsletterEmailStatus:

    return await _send_transactional_email(
        recipient=email,

        subject="You’re on the Masala House list",

        html_content=_newsletter_signup_html(),

        description="newsletter signup confirmation",
    )


# ---------------------------------------------------------------------------
# Shared transactional email sender
# ---------------------------------------------------------------------------

async def _send_transactional_email(
    *,
    recipient: str,
    subject: str,
    html_content: str,
    description: str,
) -> EmailDeliveryStatus:

    try:
        async with session_factory() as db:
            settings = await get_notification_settings(db)
    except SQLAlchemyError:
        logger.exception("Could not load email settings for %s.", description)
        return "failed"

    endpoint = settings.google_apps_script_url
    if not endpoint:
        logger.warning(
            "Email %s was not attempted because Google Apps Script is not configured.",
            description,
        )
        return "disabled"

    try:

        await send_email(
            recipient,
            subject,
            html_content,
            endpoint=endpoint,
            sender_email=settings.email_sender_email,
        )

    except EmailServiceNotConfigured:

        logger.warning(
            "Email %s was not attempted because "
            "Google Apps Script is not configured.",
            description,
        )

        return "disabled"

    except (
        httpx.HTTPError,
        RuntimeError,
        ValueError,
    ):

        logger.exception(
            "Google Apps Script email failed for %s.",
            description,
        )

        return "failed"

    logger.info(
        "Google Apps Script sent %s.",
        description,
    )

    return "sent"