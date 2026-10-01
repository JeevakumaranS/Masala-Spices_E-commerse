"""Newsletter signup validation and email-delivery behavior."""

import asyncio
from collections import defaultdict, deque
from typing import Any

import httpx
import pytest
from fastapi import HTTPException, Request
from fastapi.testclient import TestClient

from app.core.application import create_app
from app.core.database import notification_settings_table, updates_table
from app.modules.newsletter import router as newsletter_router
from app.modules.newsletter.router import NewsletterSignup, _enforce_signup_limit
from app.modules.notifications import brevo


def test_newsletter_table_has_unique_email_and_delivery_timestamp() -> None:
    assert updates_table.c.email.unique is True
    assert updates_table.c.confirmation_sent_at.nullable is True


def test_notification_settings_uses_plaintext_credential_columns() -> None:
    assert notification_settings_table.name == "notification_settings"
    assert {
        "sms_api_key",
        "sms_account_sid",
        "email_api_key",
    } <= set(notification_settings_table.c.keys())
    assert not any(
        column.endswith("_encrypted")
        for column in notification_settings_table.c.keys()
    )


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


def test_newsletter_email_reports_disabled_when_brevo_is_not_configured() -> None:
    class EmptySettingsDatabase:
        async def execute(self, *_args: object, **_kwargs: object) -> object:
            class Result:
                @staticmethod
                def mappings() -> "Result":
                    return Result()

                @staticmethod
                def first() -> None:
                    return None

            return Result()

    result = asyncio.run(
        brevo.send_newsletter_signup_email(EmptySettingsDatabase(), "person@example.com")
    )

    assert result == "disabled"


def test_newsletter_email_posts_to_brevo_when_enabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request: dict[str, Any] = {}

    class SettingsResult:
        @staticmethod
        def mappings() -> "SettingsResult":
            return SettingsResult()

        @staticmethod
        def first() -> dict[str, Any]:
            return {
                "email_enabled": True,
                "email_api_key": "test-api-key",
                "email_sender_name": "Masala House",
                "email_sender_email": "hello@example.com",
            }

    class SettingsDatabase:
        async def execute(self, *_args: object, **_kwargs: object) -> SettingsResult:
            return SettingsResult()

    class SuccessfulResponse:
        is_error = False
        status_code = 201

        @staticmethod
        def raise_for_status() -> None:
            return None

    class RecordingClient:
        def __init__(self, **_kwargs: object) -> None:
            pass

        async def __aenter__(self) -> "RecordingClient":
            return self

        async def __aexit__(self, *_args: object) -> None:
            return None

        async def post(
            self,
            url: str,
            *,
            headers: dict[str, str],
            json: dict[str, Any],
        ) -> SuccessfulResponse:
            assert headers["api-key"] == "test-api-key"
            request["url"] = url
            request["json"] = json
            return SuccessfulResponse()

    monkeypatch.setattr(brevo.httpx, "AsyncClient", RecordingClient)

    result = asyncio.run(
        brevo.send_newsletter_signup_email(
            SettingsDatabase(),
            "person@example.com",
        )
    )

    assert result == "sent"
    assert request["url"] == brevo._BREVO_TRANSACTIONAL_EMAIL_URL
    assert request["json"]["to"] == [{
        "email": "person@example.com",
        "name": "Newsletter subscriber",
    }]


def test_brevo_failure_logs_provider_reason_without_recipient(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    recipient = "person@example.com"
    sender = "hello@example.com"

    class SettingsResult:
        @staticmethod
        def mappings() -> "SettingsResult":
            return SettingsResult()

        @staticmethod
        def first() -> dict[str, Any]:
            return {
                "email_enabled": True,
                "email_api_key": "test-api-key",
                "email_sender_name": "Masala House",
                "email_sender_email": sender,
            }

    class SettingsDatabase:
        async def execute(self, *_args: object, **_kwargs: object) -> SettingsResult:
            return SettingsResult()

    class RejectedResponse:
        is_error = True
        status_code = 400

        @staticmethod
        def json() -> dict[str, str]:
            return {
                "code": "invalid_parameter",
                "message": f"Sender {sender} cannot email {recipient}.",
            }

        def raise_for_status(self) -> None:
            request = httpx.Request("POST", brevo._BREVO_TRANSACTIONAL_EMAIL_URL)
            response = httpx.Response(400, request=request)
            raise httpx.HTTPStatusError("400 Bad Request", request=request, response=response)

    class RejectingClient:
        def __init__(self, **_kwargs: object) -> None:
            pass

        async def __aenter__(self) -> "RejectingClient":
            return self

        async def __aexit__(self, *_args: object) -> None:
            return None

        async def post(self, *_args: object, **_kwargs: object) -> RejectedResponse:
            return RejectedResponse()

    monkeypatch.setattr(brevo.httpx, "AsyncClient", RejectingClient)

    result = asyncio.run(
        brevo.send_newsletter_signup_email(SettingsDatabase(), recipient)
    )

    assert result == "failed"
    assert "HTTP 400 (code=invalid_parameter)" in caplog.text
    assert recipient not in caplog.text
    assert sender not in caplog.text


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

    async def failed_delivery(_db: object, _email: str) -> str:
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
