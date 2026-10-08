"""Send transactional email through the configured Google Apps Script web app."""

import os
from typing import Any

import httpx

GOOGLE_APPS_SCRIPT_URL_ENV = "GOOGLE_APPS_SCRIPT_URL"


class EmailServiceNotConfigured(RuntimeError):
    """Raised when the Apps Script endpoint is missing or invalid."""


async def send_email(
    to: str,
    subject: str,
    html: str,
    endpoint: str | None = None,
    sender_email: str = "",
) -> Any:
    endpoint = (
        endpoint.strip()
        if endpoint is not None
        else os.getenv(GOOGLE_APPS_SCRIPT_URL_ENV, "").strip()
    )
    if not endpoint:
        raise EmailServiceNotConfigured(
            f"{GOOGLE_APPS_SCRIPT_URL_ENV} is not configured."
        )

    try:
        parsed_endpoint = httpx.URL(endpoint)
    except httpx.InvalidURL as error:
        raise EmailServiceNotConfigured(
            f"{GOOGLE_APPS_SCRIPT_URL_ENV} must be a deployed Google Apps Script HTTPS URL."
        ) from error
    if (
        parsed_endpoint.scheme != "https"
        or parsed_endpoint.host != "script.google.com"
        or not parsed_endpoint.path.startswith("/macros/s/")
        or not parsed_endpoint.path.endswith("/exec")
        or parsed_endpoint.username
        or parsed_endpoint.password
        or parsed_endpoint.query
        or parsed_endpoint.fragment
    ):
        raise EmailServiceNotConfigured(
            f"{GOOGLE_APPS_SCRIPT_URL_ENV} must be a deployed Google Apps Script HTTPS URL."
        )

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        payload = {"to": to, "subject": subject, "html": html}
        if sender_email:
            payload["senderEmail"] = sender_email
        response = await client.post(endpoint, json=payload)

    response.raise_for_status()
    try:
        result = response.json()
    except ValueError as error:
        raise RuntimeError(
            "Google Apps Script returned a non-JSON response."
        ) from error

    if isinstance(result, dict) and (
        result.get("success") is False or result.get("status") == "error"
    ):
        raise RuntimeError("Google Apps Script reported email delivery failure.")

    return result
