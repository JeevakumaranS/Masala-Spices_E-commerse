"""Validation for admin-managed blog posts."""

import asyncio
from datetime import date

import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient

from app.core.application import create_app
from app.modules.admin.auth import require_admin
from app.modules.blog.data import sample_blog_posts
from app.modules.blog import router as blog_router
from app.modules.blog.schemas import BlogPostInput


def _blog_payload() -> dict[str, object]:
    return {
        "title": "  Fresh Spice Notes  ",
        "slug": " Fresh Spice Notes ",
        "category": "  Pantry  ",
        "published_at": "2026-10-05",
        "hero_image_url": "https://images.example.test/spices.jpg",
        "body": "  A useful story about spice.  ",
        "status": "published",
    }


def test_blog_post_input_normalizes_editorial_fields() -> None:
    post = BlogPostInput.model_validate(_blog_payload())

    assert post.title == "Fresh Spice Notes"
    assert post.slug == "fresh-spice-notes"
    assert post.category == "Pantry"
    assert post.published_at == date(2026, 10, 5)
    assert post.body == "A useful story about spice."
    assert post.status == "published"


@pytest.mark.parametrize(
    ("field", "value"),
    [("title", "   "), ("slug", "---"), ("category", " "), ("body", "  ")],
)
def test_blog_post_input_rejects_blank_required_fields(field: str, value: str) -> None:
    payload = _blog_payload()
    payload[field] = value

    with pytest.raises(ValidationError):
        BlogPostInput.model_validate(payload)


def test_blog_post_input_rejects_non_http_image_reference() -> None:
    payload = _blog_payload()
    payload["hero_image_url"] = "javascript:alert(1)"

    with pytest.raises(ValidationError, match=r"HTTP\(S\) photo URL"):
        BlogPostInput.model_validate(payload)


def test_sample_blog_data_has_ten_unique_posts() -> None:
    assert len(sample_blog_posts) == 10
    assert len({post["slug"] for post in sample_blog_posts}) == 10


def test_blog_post_response_signs_rustfs_image_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(blog_router, "object_exists", lambda _key: True)
    monkeypatch.setattr(blog_router, "get_file_url", lambda key: f"https://storage.example/{key}")

    post = asyncio.run(blog_router._blog_post_response({
        "hero_image_url": "homepage/blog/hero.jpg",
    }))

    assert post["hero_image_key"] == "homepage/blog/hero.jpg"
    assert post["hero_image_url"] == "https://storage.example/homepage/blog/hero.jpg"


def test_admin_blog_crud_publishes_and_deletes_posts() -> None:
    application = create_app()
    application.dependency_overrides[require_admin] = lambda: "blog-test-admin"
    slug = f"admin-blog-test-{date.today().isoformat()}"
    post_id: str | None = None
    payload = {
        "title": "Admin blog CRUD test",
        "slug": slug,
        "category": "Testing",
        "published_at": date.today().isoformat(),
        "hero_image_url": "https://images.example.test/blog-test.jpg",
        "body": "A test-only story.",
        "status": "draft",
    }

    with TestClient(application) as client:
        try:
            created = client.post("/api/admin/blog", json=payload)
            assert created.status_code == 201, created.text
            post_id = created.json()["id"]
            assert created.json()["status"] == "draft"
            assert client.get(f"/api/blog/{slug}").status_code == 404

            payload.update({"title": "Published blog CRUD test", "status": "published"})
            updated = client.put(f"/api/admin/blog/{post_id}", json=payload)
            assert updated.status_code == 200, updated.text
            assert updated.json()["title"] == "Published blog CRUD test"

            public_post = client.get(f"/api/blog/{slug}")
            assert public_post.status_code == 200, public_post.text
            assert public_post.json()["body"] == "A test-only story."

            deleted = client.delete(f"/api/admin/blog/{post_id}")
            assert deleted.status_code == 204
            post_id = None
            assert client.get(f"/api/blog/{slug}").status_code == 404
        finally:
            if post_id is not None:
                client.delete(f"/api/admin/blog/{post_id}")
