"""Google Apps Script email transport behavior."""

import asyncio
from typing import Any

import pytest

import email_service


def test_send_email_posts_payload_and_follows_apps_script_redirects(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request: dict[str, Any] = {}

    class Response:
        @staticmethod
        def raise_for_status() -> None:
            return None

        @staticmethod
        def json() -> dict[str, bool]:
            return {"success": True}

    class RecordingClient:
        def __init__(self, *, timeout: int, follow_redirects: bool) -> None:
            request["timeout"] = timeout
            request["follow_redirects"] = follow_redirects

        async def __aenter__(self) -> "RecordingClient":
            return self

        async def __aexit__(self, *_args: object) -> None:
            return None

        async def post(
            self,
            url: str,
            *,
            json: dict[str, str],
        ) -> Response:
            request["url"] = url
            request["json"] = json
            return Response()

    monkeypatch.setenv(
        email_service.GOOGLE_APPS_SCRIPT_URL_ENV,
        "https://script.google.com/macros/s/test/exec",
    )
    monkeypatch.setattr(email_service.httpx, "AsyncClient", RecordingClient)

    result = asyncio.run(
        email_service.send_email(
            "person@example.com",
            "Order update",
            "<p>Your order is ready.</p>",
        )
    )

    assert result == {"success": True}
    assert request == {
        "timeout": 30,
        "follow_redirects": True,
        "url": "https://script.google.com/macros/s/test/exec",
        "json": {
            "to": "person@example.com",
            "subject": "Order update",
            "html": "<p>Your order is ready.</p>",
        },
    }


def test_send_email_includes_configured_sender_address(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request: dict[str, Any] = {}

    class Response:
        @staticmethod
        def raise_for_status() -> None:
            return None

        @staticmethod
        def json() -> dict[str, bool]:
            return {"success": True}

    class RecordingClient:
        def __init__(self, **_kwargs: object) -> None:
            pass

        async def __aenter__(self) -> "RecordingClient":
            return self

        async def __aexit__(self, *_args: object) -> None:
            return None

        async def post(
            self,
            _url: str,
            *,
            json: dict[str, str],
        ) -> Response:
            request.update(json)
            return Response()

    monkeypatch.setattr(email_service.httpx, "AsyncClient", RecordingClient)

    asyncio.run(
        email_service.send_email(
            "person@example.com",
            "Order update",
            "<p>Your order is ready.</p>",
            endpoint="https://script.google.com/macros/s/test/exec",
            sender_email="orders@example.com",
        )
    )

    assert request == {
        "to": "person@example.com",
        "subject": "Order update",
        "html": "<p>Your order is ready.</p>",
        "senderEmail": "orders@example.com",
    }


def test_send_email_requires_a_configured_https_endpoint(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv(email_service.GOOGLE_APPS_SCRIPT_URL_ENV, raising=False)
    with pytest.raises(email_service.EmailServiceNotConfigured):
        asyncio.run(email_service.send_email("to@example.com", "subject", "<p>body</p>"))

    monkeypatch.setenv(email_service.GOOGLE_APPS_SCRIPT_URL_ENV, "http://example.com")
    with pytest.raises(email_service.EmailServiceNotConfigured):
        asyncio.run(email_service.send_email("to@example.com", "subject", "<p>body</p>"))


def test_send_email_rejects_apps_script_failure_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class Response:
        @staticmethod
        def raise_for_status() -> None:
            return None

        @staticmethod
        def json() -> dict[str, bool]:
            return {"success": False}

    class FailedClient:
        def __init__(self, **_kwargs: object) -> None:
            pass

        async def __aenter__(self) -> "FailedClient":
            return self

        async def __aexit__(self, *_args: object) -> None:
            return None

        async def post(self, *_args: object, **_kwargs: object) -> Response:
            return Response()

    monkeypatch.setenv(
        email_service.GOOGLE_APPS_SCRIPT_URL_ENV,
        "https://script.google.com/macros/s/test/exec",
    )
    monkeypatch.setattr(email_service.httpx, "AsyncClient", FailedClient)

    with pytest.raises(RuntimeError, match="reported email delivery failure"):
        asyncio.run(email_service.send_email("to@example.com", "subject", "<p>body</p>"))
