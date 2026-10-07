"""Notification provider environment configuration behavior."""

import asyncio
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.core.application import create_app
from app.core.database import get_db
from app.modules.admin.auth import require_admin
from app.modules.notifications import twilio
from app.modules.notifications.settings import NotificationSettings


def test_twilio_sends_using_environment_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = NotificationSettings(
        sms_enabled=True,
        sms_account_sid="AC" + "1" * 32,
        sms_auth_token="database-auth-token",
        sms_sender_phone="+14155550123",
        email_enabled=False,
        email_api_key="",
        email_sender_name="",
        email_sender_email="",
    )

    async def load_settings(_db: object) -> NotificationSettings:
        return settings

    class SessionContext:
        async def __aenter__(self) -> object:
            return object()

        async def __aexit__(self, *_args: object) -> None:
            return None

    request: dict[str, Any] = {}

    class SuccessfulResponse:
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
            auth: tuple[str, str],
            data: dict[str, str],
        ) -> SuccessfulResponse:
            request.update(url=url, auth=auth, data=data)
            return SuccessfulResponse()

    monkeypatch.setattr(twilio.httpx, "AsyncClient", RecordingClient)
    monkeypatch.setattr(twilio, "session_factory", SessionContext)
    monkeypatch.setattr(twilio, "get_notification_settings", load_settings)

    result = asyncio.run(
        twilio.send_order_confirmation_sms(
            {
                "order_number": "MH-1001",
                "phone": "+919876543210",
                "total": 120,
                "items": [{"name": "Sambar Masala", "qty": 1}],
            }
        )
    )

    assert result == "sent"
    assert request["auth"] == ("AC" + "1" * 32, "database-auth-token")
    assert request["data"]["From"] == "+14155550123"


def test_admin_can_manage_database_notification_settings_and_reveal_keys() -> None:
    class StoredValue:
        def __init__(self, row: dict[str, Any]) -> None:
            self.row = row

        def mappings(self) -> "StoredValue":
            return self

        def first(self) -> dict[str, Any]:
            return self.row

    class FakeSession:
        row: dict[str, Any] = {}

        async def execute(self, statement: object) -> StoredValue:
            if getattr(statement, "is_insert", False):
                params = statement.compile().params  # type: ignore[attr-defined]
                for key in (
                    "sms_enabled",
                    "sms_account_sid",
                    "sms_auth_token",
                    "sms_sender_phone",
                    "email_enabled",
                    "email_api_key",
                    "email_sender_name",
                    "email_sender_email",
                ):
                    if params[key] is not None or key not in self.row:
                        self.row[key] = params[key]
            return StoredValue(self.row)

        async def commit(self) -> None:
            return None

    session = FakeSession()

    async def override_db():
        yield session

    application = create_app()
    application.dependency_overrides[get_db] = override_db
    application.dependency_overrides[require_admin] = lambda: "notification-test-admin"

    try:
        with TestClient(application) as client:
            response = client.put(
                "/api/admin/integration-settings",
                json={
                    "sms_enabled": True,
                    "sms_account_sid": "AC123",
                    "sms_auth_token": "twilio-private",
                    "sms_sender_phone": "+14155550123",
                    "email_enabled": True,
                    "email_api_key": "brevo-private",
                    "email_sender_name": "Masala House",
                    "email_sender_email": "hello@example.com",
                },
            )
            assert response.status_code == 200, response.text
            assert response.json()["sms_enabled"] is True
            assert response.json()["email_enabled"] is True
            assert response.json()["sms_configured"] is True
            assert response.json()["email_configured"] is True
            assert response.json()["email_api_key_configured"] is True
            assert response.json()["email_api_key"] == "brevo-private"
            assert response.json()["sms_auth_token"] == "twilio-private"
            assert session.row["sms_auth_token"] == "twilio-private"
            assert session.row["email_api_key"] == "brevo-private"

            settings = client.get("/api/admin/integration-settings")
            assert settings.status_code == 200, settings.text
            assert settings.json()["email_api_key_configured"] is True
            assert settings.json()["sms_enabled"] is True
            assert settings.json()["email_enabled"] is True
            assert settings.json()["email_api_key"] == "brevo-private"
            assert settings.json()["sms_auth_token"] == "twilio-private"

            old_email_key = session.row["email_api_key"]
            old_twilio_token = session.row["sms_auth_token"]
            disabled = client.put(
                "/api/admin/integration-settings",
                json={
                    "sms_enabled": False,
                    "sms_account_sid": "AC123",
                    "sms_sender_phone": "+14155550123",
                    "email_enabled": False,
                    "email_sender_name": "Masala House",
                    "email_sender_email": "hello@example.com",
                },
            )
            assert disabled.status_code == 200, disabled.text
            assert disabled.json()["sms_enabled"] is False
            assert disabled.json()["email_enabled"] is False
            assert disabled.json()["email_api_key_configured"] is True
            assert session.row["email_api_key"] == old_email_key
            assert session.row["sms_auth_token"] == old_twilio_token
    finally:
        application.dependency_overrides.clear()
