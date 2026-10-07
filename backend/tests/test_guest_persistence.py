"""Contract checks for guest identity and anonymous persistence routes."""

from uuid import UUID

from fastapi.testclient import TestClient

from app.core.application import create_app
from app.core.database import get_db, guest_cart_items_table, guest_watchlist_items_table


class _Session:
    def __init__(self, calls: list[str]) -> None:
        self.calls = calls

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def execute(self, _statement):
        self.calls.append("execute")

    async def commit(self):
        self.calls.append("commit")


class _SessionFactory:
    def __init__(self) -> None:
        self.calls: list[str] = []

    def __call__(self) -> _Session:
        return _Session(self.calls)


class _EmptyResult:
    def mappings(self):
        return self

    def __iter__(self):
        return iter(())


class _EmptyDatabase:
    async def execute(self, _statement):
        return _EmptyResult()


def test_guest_cart_and_watchlist_tables_have_guest_scoped_keys() -> None:
    assert {"guest_id", "product_id", "variant_key"}.issubset(
        guest_cart_items_table.primary_key.columns.keys()
    )
    assert {"guest_id", "product_id"}.issubset(
        guest_watchlist_items_table.primary_key.columns.keys()
    )


def test_guest_routes_are_registered() -> None:
    paths = set(create_app().openapi()["paths"])

    assert "/api/cart" in paths
    assert "/api/watchlist" in paths


def test_guest_cart_and_watchlist_endpoints_return_server_owned_data(monkeypatch) -> None:
    from app.core import guest_middleware

    sessions = _SessionFactory()
    monkeypatch.setattr(guest_middleware, "session_factory", sessions)
    app = create_app()

    async def get_empty_db():
        yield _EmptyDatabase()

    app.dependency_overrides[get_db] = get_empty_db
    with TestClient(app) as client:
        cart_response = client.get("/api/cart")
        watchlist_response = client.get("/api/watchlist")

    assert cart_response.status_code == 200
    assert cart_response.json() == []
    assert watchlist_response.status_code == 200
    assert watchlist_response.json() == []
    assert cart_response.cookies.get("guest_id") is not None
    assert sessions.calls == ["execute", "commit", "execute", "commit"]


def test_api_request_creates_uuid7_cookie_and_tracks_existing_guest(monkeypatch) -> None:
    from app.core import guest_middleware

    sessions = _SessionFactory()
    monkeypatch.setattr(guest_middleware, "session_factory", sessions)
    with TestClient(create_app()) as client:
        first_response = client.get("/api/guest-cookie-check")
        cookie = first_response.cookies.get("guest_id")
        assert cookie is not None
        assert UUID(cookie).version == 7
        assert "httponly" in first_response.headers["set-cookie"].lower()
        assert "samesite=lax" in first_response.headers["set-cookie"].lower()
        assert "max-age=15552000" in first_response.headers["set-cookie"].lower()

        second_response = client.get("/api/guest-cookie-check")
        assert second_response.status_code == 404
        assert "set-cookie" not in second_response.headers
    assert sessions.calls == ["execute", "commit", "execute", "commit"]


def test_guest_cookie_is_secure_in_production(monkeypatch) -> None:
    from app.core import guest_middleware

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setattr(guest_middleware, "session_factory", _SessionFactory())
    with TestClient(create_app()) as client:
        response = client.get("/api/guest-cookie-check")

    assert "; secure" in response.headers["set-cookie"].lower()
