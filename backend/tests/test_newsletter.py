"""Newsletter signup validation and Apps Script email-delivery behavior."""

import asyncio
from collections import defaultdict, deque
from typing import Any

import pytest
from fastapi import HTTPException, Request
from fastapi.testclient import TestClient

from app.core.application import create_app
from app.core.database import updates_table
from app.modules.newsletter import router as newsletter_router
from app.modules.newsletter.router import NewsletterSignup, _enforce_signup_limit
from app.modules.notifications import email as email_notifications
from app.modules.notifications.settings import NotificationSettings


def mock_email_settings(
    monkeypatch: pytest.MonkeyPatch,
    settings: NotificationSettings,
) -> None:
    class SessionContext:
        async def __aenter__(self) -> object:
            return object()

        async def __aexit__(self, *_args: object) -> None:
            return None

    async def load_settings(_db: object) -> NotificationSettings:
        return settings

    monkeypatch.setattr(email_notifications, "session_factory", SessionContext)
    monkeypatch.setattr(email_notifications, "get_notification_settings", load_settings)


def test_newsletter_table_has_unique_email_and_delivery_timestamp() -> None:
    assert updates_table.c.email.unique is True
    assert updates_table.c.confirmation_sent_at.nullable is True


def test_newsletter_endpoint_is_registered_and_normalizes_email() -> None:
    assert "/api/updates" in create_app().openapi()["paths"]
    assert NewsletterSignup(email="  Person@Example.COM ").email == "person@example.com"


def test_newsletter_rejects_invalid_email_without_database_access() -> None:
    client = TestClient(create_app())

    response = client.post("/api/updates", json={"email": "not-an-email"})

    assert response.status_code == 422


def test_newsletter_signup_rate_limit_is_bounded(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(newsletter_router, "_signup_attempts", defaultdict(deque))
    for _ in range(newsletter_router._SIGNUP_LIMIT):
        _enforce_signup_limit("192.0.2.1")

    with pytest.raises(HTTPException) as error:
        _enforce_signup_limit("192.0.2.1")

    assert error.value.status_code == 429


def test_newsletter_email_reports_disabled_without_apps_script(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mock_email_settings(monkeypatch, NotificationSettings(False, "", "", ""))

    result = asyncio.run(
        email_notifications.send_newsletter_signup_email("person@example.com")
    )

    assert result == "disabled"


def test_newsletter_email_sends_html_through_apps_script(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request: dict[str, Any] = {}
    mock_email_settings(
        monkeypatch,
        NotificationSettings(
            False,
            "",
            "",
            "",
            google_apps_script_url="https://script.google.com/macros/s/test/exec",
            email_sender_email="orders@example.com",
        ),
    )

    async def record_send(
        to: str,
        subject: str,
        html: str,
        *,
        endpoint: str | None = None,
        sender_email: str = "",
    ) -> dict[str, bool]:
        request.update(to=to, subject=subject, html=html)
        request["endpoint"] = endpoint
        request["sender_email"] = sender_email
        return {"success": True}

    monkeypatch.setattr(email_notifications, "send_email", record_send)

    result = asyncio.run(
        email_notifications.send_newsletter_signup_email("person@example.com")
    )

    assert result == "sent"
    assert request["to"] == "person@example.com"
    assert request["subject"] == "You’re on the Masala House list"
    assert "Welcome to Masala House" in request["html"]
    assert request["endpoint"] == "https://script.google.com/macros/s/test/exec"
    assert request["sender_email"] == "orders@example.com"


def test_order_confirmation_email_uses_apps_script(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request: dict[str, Any] = {}
    mock_email_settings(
        monkeypatch,
        NotificationSettings(
            False,
            "",
            "",
            "",
            google_apps_script_url="https://script.google.com/macros/s/test/exec",
            email_sender_email="orders@example.com",
        ),
    )

    async def record_send(
        to: str,
        subject: str,
        html: str,
        *,
        endpoint: str | None = None,
        sender_email: str = "",
    ) -> dict[str, bool]:
        request.update(to=to, subject=subject, html=html)
        request["endpoint"] = endpoint
        request["sender_email"] = sender_email
        return {"success": True}

    monkeypatch.setattr(email_notifications, "send_email", record_send)

    result = asyncio.run(
        email_notifications.send_order_confirmation_email(
            {
                "email": "customer@example.com",
                "customer_name": "Masala Customer",
                "order_number": "MH-1001",
                "items": [
                    {
                        "name": "Sambar Masala",
                        "pack_size": "100g",
                        "qty": 2,
                        "line_total": 240,
                    }
                ],
                "subtotal": 240,
                "discount_amount": 0,
                "shipping_amount": 0,
                "total": 240,
            }
        )
    )

    assert result == "sent"
    assert request["to"] == "customer@example.com"
    assert request["subject"] == "Order confirmation — Masala House"
    assert "Thank you, Masala Customer" in request["html"]
    assert "Sambar Masala" in request["html"]


def test_newsletter_signup_attempts_email_for_unconfirmed_subscription(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class SignupResult:
        @staticmethod
        def mappings() -> "SignupResult":
            return SignupResult()

        @staticmethod
        def first() -> dict[str, object]:
            return {"id": "subscription-id", "confirmation_sent_at": None}

    class SignupDatabase:
        executions = 0
        committed = False

        async def execute(self, *_args: object, **_kwargs: object) -> SignupResult:
            self.executions += 1
            return SignupResult()

        async def commit(self) -> None:
            self.committed = True

        async def rollback(self) -> None:
            raise AssertionError("Successful newsletter persistence should not roll back.")

    async def failed_delivery(_email: str) -> str:
        return "failed"

    monkeypatch.setattr(newsletter_router, "_signup_attempts", defaultdict(deque))
    monkeypatch.setattr(
        newsletter_router,
        "send_newsletter_signup_email",
        failed_delivery,
    )
    database = SignupDatabase()
    request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/updates",
            "headers": [],
            "client": ("192.0.2.2", 1234),
            "server": ("testserver", 80),
            "scheme": "http",
            "query_string": b"",
        }
    )

    response = asyncio.run(
        newsletter_router.signup_for_updates(
            NewsletterSignup(email="person@example.com"),
            request,
            database,  # type: ignore[arg-type]
        )
    )

    assert response == {"subscribed": True, "email_status": "failed"}
    assert database.executions == 2
    assert database.committed is True
