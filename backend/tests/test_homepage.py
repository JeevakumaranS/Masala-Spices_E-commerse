"""Focused tests for the editable homepage content contract."""

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.modules.homepage.schemas import DEFAULT_HOME_PAGE_CONTENT, HomePageContent
from app.modules.homepage.router import _validate_import_url


def test_homepage_content_defaults_validate_all_editable_sections() -> None:
    content = HomePageContent.model_validate(DEFAULT_HOME_PAGE_CONTENT.model_dump())

    assert "hero" not in content.model_dump()
    assert len(content.categories.items) == 5
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


@pytest.mark.parametrize(
    "image_url",
    [
        "http://images.unsplash.com/photo.jpg",
        "https://localhost/image.jpg",
        "https://images.unsplash.com.evil.test/photo.jpg",
        "https://user:password@images.unsplash.com/photo.jpg",
        "https://images.unsplash.com:8443/photo.jpg",
    ],
)
def test_homepage_image_import_rejects_untrusted_sources(image_url: str) -> None:
    with pytest.raises(HTTPException) as error:
        _validate_import_url(image_url)
    assert error.value.status_code == 422


@pytest.mark.parametrize(
    "image_url",
    [
        "https://images.unsplash.com/photo-123.jpg",
        "https://imgs.search.brave.com/photo.jpg",
        "https://shop.cookdtv.com/cdn/shop/files/cat-kulambu.png",
        "https://img.magnific.com/free-psd/spices.jpg",
        "https://tiimg.tistatic.com/fp/1/007/630/turmeric.jpg",
        "https://images.jdmagicbox.com/quickquotes/images_main/pickles.png",
        "https://assets.cookdtv.com/t/640/recipe-image",
    ],
)
def test_homepage_image_import_allows_known_image_sources(image_url: str) -> None:
    assert _validate_import_url(image_url) == image_url
