"""Focused tests for the editable homepage content contract."""

import asyncio

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.application import create_app
from app.modules.homepage.schemas import DEFAULT_HOME_PAGE_CONTENT, HomePageContent
from app.modules.homepage import router as homepage_router
from app.modules.homepage.router import save_homepage_content


def test_homepage_content_defaults_validate_all_editable_sections() -> None:
    content = HomePageContent.model_validate(DEFAULT_HOME_PAGE_CONTENT.model_dump())

    assert "hero" not in content.model_dump()
    assert len(content.categories.items) == 5
    assert all(not item.image_url for item in content.categories.items)
    assert content.bestsellers.title == "Bestsellers"
    assert content.bestsellers.product_slugs == []
    assert not hasattr(content.bestsellers, "description")
    assert content.combos.title == "Better valued Combos"
    assert content.combos.description
    assert content.recipes.link_href == "/recipes"
    content_data = content.model_dump()
    assert "image_overrides" not in content_data["combos"]
    assert "image_overrides" not in content_data["recipes"]
    assert "cta" not in content_data


def test_homepage_content_ignores_removed_legacy_settings() -> None:
    payload = DEFAULT_HOME_PAGE_CONTENT.model_dump()
    payload["hero"] = {"title": "Legacy title", "description": "Legacy description"}
    payload["bestsellers"]["description"] = "Legacy description"
    payload["bestsellers"]["image_overrides"] = [{"product_slug": "x"}]
    payload["combos"]["image_overrides"] = [{"product_slug": "x"}]
    payload["recipes"]["image_overrides"] = [{"recipe_slug": "x"}]
    payload["cta"] = {"title": "Legacy CTA"}

    content = HomePageContent.model_validate(payload)

    content_data = content.model_dump()
    assert "hero" not in content_data
    assert "description" not in content_data["bestsellers"]
    assert "image_overrides" not in content_data["bestsellers"]
    assert "image_overrides" not in content_data["combos"]
    assert "image_overrides" not in content_data["recipes"]
    assert "cta" not in content_data


def test_homepage_content_rejects_excessive_ticker_items() -> None:
    payload = DEFAULT_HOME_PAGE_CONTENT.model_dump()
    payload["ticker"] = ["Promise"] * 21

    with pytest.raises(ValidationError):
        HomePageContent.model_validate(payload)


def test_homepage_settings_reject_photo_urls() -> None:
    payload = DEFAULT_HOME_PAGE_CONTENT.model_copy(deep=True)
    payload.categories.items[0].image_url = "https://images.example.test/photo.jpg"

    with pytest.raises(HTTPException) as error:
        asyncio.run(save_homepage_content(payload, None))

    assert error.value.status_code == 422


def test_about_image_endpoint_returns_signed_rustfs_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        homepage_router,
        "get_file_url",
        lambda image_key: f"https://storage.example/{image_key}?signature=test",
    )

    response = TestClient(create_app()).get("/api/about-image")

    assert response.status_code == 200
    assert response.json() == {
        "image_url": (
            f"https://storage.example/{homepage_router.ABOUT_IMAGE_KEY}"
            "?signature=test"
        )
    }
