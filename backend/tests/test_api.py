"""Smoke tests for the public and protected HTTP API contracts."""

import asyncio
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import psycopg
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt
from pydantic import ValidationError

from app.core.application import create_app
from app.core.database import DATABASE_URL
from app.core.database import admin_users_table
from app.modules.admin import router as admin_router
from app.modules.admin.auth import issue_token, require_admin
from app.modules.admin.router import CouponInput
from app.modules.products.router import hydrate_products
from app.routers import uploads
from app.services import storage
from app.services.storage import get_file_url


@pytest.fixture(scope="module")
def client() -> TestClient:
    with TestClient(create_app()) as test_client:
        yield test_client


def test_health_endpoint(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_admin_user_created_at_uses_timezone_aware_database_type() -> None:
    assert admin_users_table.c.created_at.type.timezone is True


def test_admin_token_is_jwt_with_configured_expiration(monkeypatch: pytest.MonkeyPatch) -> None:
    secret = "test-admin-token-secret-that-is-long-enough"
    monkeypatch.setenv("ADMIN_TOKEN_SECRET", secret)
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")

    token = issue_token(" Admin@Example.com ")

    assert len(token.split(".")) == 3
    payload = jwt.decode(token, secret, algorithms=["HS256"])
    assert payload["sub"] == "admin@example.com"
    assert payload["exp"] - payload["iat"] == 15 * 60


def test_require_admin_rejects_expired_jwt_before_database_access(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    secret = "test-admin-token-secret-that-is-long-enough"
    monkeypatch.setenv("ADMIN_TOKEN_SECRET", secret)
    token = jwt.encode(
        {
            "sub": "admin@example.com",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        secret,
        algorithm="HS256",
    )

    class UnusedDatabase:
        async def execute(self, *_args: object, **_kwargs: object) -> object:
            raise AssertionError("Expired tokens must be rejected before querying admins.")

    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    with pytest.raises(HTTPException) as error:
        asyncio.run(require_admin(credentials=credentials, db=UnusedDatabase()))

    assert error.value.status_code == 401
    assert error.value.detail == "Invalid or expired admin token."


def test_homepage_hero_image_routes_are_registered() -> None:
    paths = set(create_app().openapi()["paths"])

    assert "/api/hero-images" in paths
    assert "/api/admin/hero-images" in paths
    assert "/api/admin/hero-images/{image_id}" in paths


def test_admin_hero_image_list_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/admin/hero-images")

    assert response.status_code == 401


def test_hero_image_response_includes_presigned_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(admin_router, "get_file_url", lambda key: f"https://storage.example/{key}")

    response = asyncio.run(admin_router._hero_image_response({
        "id": "hero-id",
        "object_key": "hero/hero-id/banner.jpg",
        "alt_text": "Spice blends",
        "sort_order": 0,
    }))

    assert response["url"] == "https://storage.example/hero/hero-id/banner.jpg"
    assert response["object_key"] == "hero/hero-id/banner.jpg"


def _fake_overview_dependencies(
    monkeypatch: pytest.MonkeyPatch,
    *,
    failing_widget: str | None = None,
) -> TestClient:
    class EmptySessionContext:
        async def __aenter__(self) -> object:
            return object()

        async def __aexit__(self, *_args: object) -> None:
            return None

    async def success_value(_db: object = None, **_kwargs: object) -> list[dict[str, object]]:
        return []

    async def failing_value(_db: object = None, **_kwargs: object) -> list[dict[str, object]]:
        raise RuntimeError("widget failure")

    async def analytics_value(_db: object = None, **_kwargs: object) -> dict[str, object]:
        return {
            "total_revenue": 0,
            "orders_count": 0,
            "top_items": [],
            "avg_order_value": 0,
        }

    monkeypatch.setattr(admin_router, "session_factory", EmptySessionContext)
    for widget, handler in (
        ("products", "admin_products"),
        ("categories", "admin_categories"),
        ("orders", "_all_admin_orders"),
        ("coupons", "admin_coupons"),
        ("reviews", "admin_reviews"),
        ("hero_images", "_list_hero_images"),
        ("analytics", "analytics_summary"),
    ):
        monkeypatch.setattr(
            admin_router,
            handler,
            failing_value
            if widget == failing_widget
            else analytics_value
            if widget == "analytics"
            else success_value,
        )

    application = create_app()
    application.dependency_overrides[require_admin] = lambda: "overview-test-admin"
    return TestClient(application)


def test_admin_overview_returns_widget_data(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    admin_router._overview_cache.clear()
    with _fake_overview_dependencies(monkeypatch) as overview_client:
        response = overview_client.get("/api/admin/overview?force_refresh=true")

    assert response.status_code == 200
    payload = response.json()
    assert set(payload["data"]) == {
        "products", "categories", "orders", "coupons", "reviews", "hero_images", "analytics",
    }
    assert all(
        payload["data"][widget] == []
        for widget in ("products", "categories", "orders", "coupons", "reviews", "hero_images")
    )
    assert payload["data"]["analytics"]["orders_count"] == 0
    assert payload["errors"] == {}


def test_admin_overview_returns_partial_data_when_a_widget_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    admin_router._overview_cache.clear()
    with _fake_overview_dependencies(monkeypatch, failing_widget="categories") as overview_client:
        response = overview_client.get("/api/admin/overview?force_refresh=true")

    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["categories"] is None
    assert payload["errors"]["categories"] == "Unable to load this widget."
    assert payload["data"]["products"] == []


def test_shipping_options_endpoint(client: TestClient) -> None:
    response = client.get("/api/orders/shipping-options")

    assert response.status_code == 200
    payload = response.json()
    assert payload["currency"] == "INR"
    assert payload["domestic"]["country_code"] == "IN"
    assert payload["international"]["destinations"]


@pytest.mark.parametrize("method", ["PATCH", "PUT"])
def test_admin_review_preflight_allows_local_frontend(
    client: TestClient,
    method: str,
) -> None:
    response = client.options(
        "/api/admin/reviews/test-review-id",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert method in response.headers["access-control-allow-methods"]
    assert "authorization" in response.headers["access-control-allow-headers"].lower()


@pytest.mark.parametrize(
    "origin",
    [
        "http://localhost:3000",
        "http://127.0.0.1:3001",
        "http://[::1]:3000",
    ],
)
def test_image_upload_preflight_allows_local_frontend(
    client: TestClient,
    origin: str,
) -> None:
    response = client.options(
        "/api/uploads/image",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert "POST" in response.headers["access-control-allow-methods"]
    assert "content-type" in response.headers["access-control-allow-headers"].lower()


def test_image_upload_storage_failure_returns_cors_error(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_upload(*args: object, **kwargs: object) -> None:
        raise RuntimeError("RustFS is unavailable")

    monkeypatch.setattr(uploads, "upload_file", fail_upload)
    response = client.post(
        "/api/uploads/image?product_id=00000000-0000-0000-0000-000000000001",
        files={"file": ("test.jpg", b"test image", "image/jpeg")},
        headers={"Origin": "http://localhost:3000"},
    )

    assert response.status_code == 502
    assert "RustFS endpoint" in response.json()["detail"]
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_image_upload_uses_unique_product_scoped_keys(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    uploaded: list[tuple[str, str]] = []

    def record_upload(file: object, object_name: str, content_type: str) -> str:
        uploaded.append((object_name, content_type))
        return object_name

    monkeypatch.setattr(uploads, "upload_file", record_upload)
    product_id = "00000000-0000-0000-0000-000000000001"
    responses = [
        client.post(
            f"/api/uploads/image?product_id={product_id}",
            files={"file": ("test.PNG", b"test image", "image/png")},
        )
        for _ in range(2)
    ]

    assert all(response.status_code == 200 for response in responses)
    object_keys = [response.json()["object_key"] for response in responses]
    assert object_keys[0] != object_keys[1]
    assert all(key.startswith(f"products/{product_id}/") and key.endswith(".png") for key in object_keys)
    assert uploaded == [(key, "image/png") for key in object_keys]


def test_storage_upload_sets_immutable_cache_headers(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}

    def record_upload(file: object, bucket: str, key: str, *, ExtraArgs: dict[str, str]) -> None:
        captured.update(ExtraArgs)

    monkeypatch.setattr(storage.s3, "upload_fileobj", record_upload)
    storage.upload_file(object(), "products/test/image.png", "image/png")

    assert captured == {
        "ContentType": "image/png",
        "CacheControl": "public, max-age=31536000, immutable",
    }


def test_replaced_product_images_are_deleted_but_retained_images_are_not(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    deleted: list[str] = []
    monkeypatch.setattr(admin_router, "delete_object", deleted.append)

    admin_router._delete_replaced_product_images(
        uuid4(),
        ["products/old/image.jpg", "products/shared/image.jpg"],
        ["products/new/image.jpg", "products/shared/image.jpg"],
    )

    assert deleted == ["products/old/image.jpg"]


def test_product_hydration_resolves_object_keys_and_preserves_external_urls(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class EmptyVariantResult:
        def mappings(self) -> "EmptyVariantResult":
            return self

        def __iter__(self) -> object:
            return iter(())

    class EmptyVariantDatabase:
        async def execute(self, query: object) -> EmptyVariantResult:
            return EmptyVariantResult()

    monkeypatch.setattr("app.modules.products.router.object_exists", lambda key: True)
    product = {
        "id": "product-id",
        "name": "Test product",
        "images": [
            "products/test.jpg",
            get_file_url("products/legacy.jpg"),
            "https://images.example.com/external.jpg",
        ],
    }
    hydrated = asyncio.run(hydrate_products(EmptyVariantDatabase(), [product]))

    assert len(hydrated[0]["images"]) == 3
    assert hydrated[0]["images"][0]["url"].startswith("http://")
    assert "Signature=" in hydrated[0]["images"][0]["url"]
    assert hydrated[0]["images"][0]["object_key"] == "products/test.jpg"
    assert hydrated[0]["images"][1]["object_key"] == "products/legacy.jpg"
    assert hydrated[0]["images"][1]["url"] != product["images"][1]
    assert hydrated[0]["images"][2]["url"] == "https://images.example.com/external.jpg"
    assert hydrated[0]["images"][2]["object_key"] is None


def test_product_hydration_skips_missing_legacy_storage_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class EmptyVariantResult:
        def mappings(self) -> "EmptyVariantResult":
            return self

        def __iter__(self) -> object:
            return iter(())

    class EmptyVariantDatabase:
        async def execute(self, query: object) -> EmptyVariantResult:
            return EmptyVariantResult()

    monkeypatch.setattr("app.modules.products.router.object_exists", lambda key: False)
    product = {
        "id": "product-id",
        "name": "Test product",
        "images": [get_file_url("products/missing.jpg"), "products/available.jpg"],
    }
    hydrated = asyncio.run(hydrate_products(EmptyVariantDatabase(), [product]))

    assert [image["object_key"] for image in hydrated[0]["images"]] == [
        "products/available.jpg",
    ]


def test_review_moderation_supports_put(client: TestClient) -> None:
    response = client.put(
        "/api/admin/reviews/00000000-0000-0000-0000-000000000001",
        json={"status": "approved"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Admin authentication required."


@pytest.mark.parametrize(
    ("path", "items_key"),
    [
        ("/api/categories", None),
        ("/api/products", "items"),
        ("/api/recipes", "items"),
        ("/api/coupons/active", None),
        ("/api/blog", None),
        ("/api/store-locations", "items"),
    ],
)
def test_public_collection_endpoints(
    client: TestClient,
    path: str,
    items_key: str | None,
) -> None:
    response = client.get(path)

    assert response.status_code == 200, response.text
    payload = response.json()
    items = payload if items_key is None else payload[items_key]
    assert isinstance(items, list)


def test_active_coupon_listing_contains_only_public_offer_fields(
    client: TestClient,
) -> None:
    response = client.get("/api/coupons/active")

    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "no-store"
    offers = response.json()
    assert isinstance(offers, list)
    public_fields = {
        "code",
        "kind",
        "label",
        "discount_value",
        "minimum_order",
        "max_discount",
        "starts_at",
        "ends_at",
        "buy_quantity",
        "free_quantity",
        "first_order_only",
    }
    assert all(set(offer) <= public_fields for offer in offers)


def test_admin_orders_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/admin/orders")

    assert response.status_code == 401
    assert response.json()["detail"] == "Admin authentication required."


def test_simple_admin_coupon_payload_is_accepted() -> None:
    coupon = CouponInput.model_validate({
        "code": "  save10 ",
        "kind": "percentage",
        "discount_value": 10,
        "minimum_order": 0,
        "active": True,
    })

    assert coupon.code == "SAVE10"
    assert coupon.label == "SAVE10"
    assert coupon.discount_value == 10


def test_buy_x_get_y_coupon_requires_terms_and_quantities() -> None:
    with pytest.raises(ValidationError, match="eligible term"):
        CouponInput.model_validate({
            "code": "BUNDLE",
            "kind": "buy_x_get_y",
            "buy_quantity": 2,
            "free_quantity": 1,
            "eligible_terms": [],
        })


def test_product_review_submission_serializes_uuid_ids(client: TestClient) -> None:
    products_response = client.get("/api/products")
    assert products_response.status_code == 200, products_response.text
    products = products_response.json()["items"]
    if not products:
        pytest.skip("A product is required to test review submission.")

    product_id = products[0]["id"]
    reviewer_name = f"API Test {uuid4()}"
    sync_database_url = DATABASE_URL.replace(
        "postgresql+asyncpg://",
        "postgresql://",
        1,
    )
    try:
        submission = client.post(
            f"/api/products/{product_id}/reviews",
            json={
                "reviewer_name": reviewer_name,
                "rating": 5,
                "comment": "Temporary API test review.",
            },
        )

        assert submission.status_code == 200, submission.text
        payload = submission.json()
        assert payload["status"] == "pending_moderation"
        assert payload["product_id"] == product_id
        assert payload["id"]
    finally:
        with psycopg.connect(sync_database_url) as connection:
            connection.execute(
                "DELETE FROM product_reviews WHERE reviewer_name = %s",
                (reviewer_name,),
            )


def test_product_reviews_are_paginated_with_total_rating(client: TestClient) -> None:
    sync_database_url = DATABASE_URL.replace(
        "postgresql+asyncpg://",
        "postgresql://",
        1,
    )
    reviewer_prefix = f"API Pagination Test {uuid4()}"
    with psycopg.connect(sync_database_url) as connection:
        product = connection.execute(
            """
            SELECT p.id
            FROM products AS p
            WHERE NOT EXISTS (
                SELECT 1
                FROM product_reviews AS r
                WHERE r.product_id = p.id
                  AND r.status = 'approved'
            )
            ORDER BY p.name
            LIMIT 1
            """
        ).fetchone()
    if product is None:
        pytest.skip("A product without approved reviews is required for isolated pagination.")
    product_id = str(product[0])

    try:
        with psycopg.connect(sync_database_url) as connection:
            for index in range(5):
                connection.execute(
                    """
                    INSERT INTO product_reviews
                        (id, product_id, reviewer_name, rating, comment, status, created_at)
                    VALUES
                        (%s, %s, %s, %s, %s, 'approved', now() - (%s * interval '1 second'))
                    """,
                    (
                        uuid4(),
                        product_id,
                        f"{reviewer_prefix} {index}",
                        index + 1,
                        "Temporary pagination test review.",
                        index,
                    ),
                )

        first_page = client.get(
            f"/api/products/{product_id}/reviews",
            params={"limit": 3, "offset": 0},
        )
        second_page = client.get(
            f"/api/products/{product_id}/reviews",
            params={"limit": 3, "offset": 3},
        )

        assert first_page.status_code == 200, first_page.text
        assert second_page.status_code == 200, second_page.text
        first_payload = first_page.json()
        second_payload = second_page.json()
        assert len(first_payload["items"]) == 3
        assert len(second_payload["items"]) == 2
        assert first_payload["total_count"] == 5
        assert first_payload["average_rating"] == 3
        assert not {
            item["id"] for item in first_payload["items"]
        }.intersection(item["id"] for item in second_payload["items"])
    finally:
        with psycopg.connect(sync_database_url) as connection:
            connection.execute(
                "DELETE FROM product_reviews WHERE reviewer_name LIKE %s",
                (f"{reviewer_prefix} %",),
            )


def test_openapi_exposes_core_endpoints(client: TestClient) -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/products" in paths
    assert "/api/orders" in paths
    assert "/api/admin/orders/{order_id}" in paths
