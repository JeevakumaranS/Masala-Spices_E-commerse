"""Input validation and image hydration for admin-managed recipes."""

import asyncio

import pytest
from pydantic import ValidationError

from app.modules.recipes.router import _recipe_response
from app.modules.recipes.schemas import RecipeInput


def _recipe_payload() -> dict[str, object]:
    return {
        "title": "  Coconut Sambar ",
        "slug": " Coconut Sambar ",
        "cook_time_minutes": 30,
        "cuisine": " South Indian ",
        "dish_type": " Main Course ",
        "ingredients": [" Toor dal ", "", "Sambar masala"],
        "steps": [" Cook dal ", "Add masala"],
        "hero_image_url": "homepage/photo.jpg",
        "video_url": " ",
    }


def test_recipe_input_normalizes_slug_and_list_fields() -> None:
    recipe = RecipeInput.model_validate(_recipe_payload())

    assert recipe.title == "Coconut Sambar"
    assert recipe.slug == "coconut-sambar"
    assert recipe.ingredients == ["Toor dal", "Sambar masala"]
    assert recipe.steps == ["Cook dal", "Add masala"]
    assert recipe.video_url is None


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("cook_time_minutes", 0),
        ("ingredients", ["", "  "]),
        ("steps", []),
        ("hero_image_url", " "),
    ],
)
def test_recipe_input_rejects_invalid_required_details(field: str, value: object) -> None:
    payload = _recipe_payload()
    payload[field] = value

    with pytest.raises(ValidationError):
        RecipeInput.model_validate(payload)


def test_recipe_public_response_signs_rustfs_photo(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.modules.recipes import router as recipes_router

    monkeypatch.setattr(recipes_router, "object_exists", lambda _key: True)
    monkeypatch.setattr(recipes_router, "get_file_url", lambda key: f"https://storage.example/{key}")

    recipe = asyncio.run(_recipe_response({
        "hero_image_url": "homepage/recipes/photo.jpg",
    }))

    assert recipe["hero_image_key"] == "homepage/recipes/photo.jpg"
    assert recipe["hero_image_url"] == "https://storage.example/homepage/recipes/photo.jpg"
