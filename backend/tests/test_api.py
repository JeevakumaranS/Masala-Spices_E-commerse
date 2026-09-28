"""Smoke tests for the public and protected HTTP API contracts."""

from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.core.application import create_app
from app.core.database import DATABASE_URL


@pytest.fixture(scope="module")
def client() -> TestClient:
    with TestClient(create_app()) as test_client:
        yield test_client


def test_health_endpoint(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


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


def test_admin_orders_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/admin/orders")

    assert response.status_code == 401
    assert response.json()["detail"] == "Admin authentication required."


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
