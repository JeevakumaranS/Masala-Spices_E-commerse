"""Recipe request and response schemas."""

import re
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class Recipe(BaseModel):
    id: UUID
    title: str
    slug: str
    cook_time_minutes: int
    cuisine: str
    dish_type: str
    ingredients: list[str] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list)
    hero_image_url: str
    hero_image_key: str | None = None
    video_url: str | None = None


class RecipeInput(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255)
    cook_time_minutes: int = Field(ge=1, le=1440)
    cuisine: str = Field(min_length=1, max_length=120)
    dish_type: str = Field(min_length=1, max_length=120)
    ingredients: list[str] = Field(min_length=1, max_length=100)
    steps: list[str] = Field(min_length=1, max_length=100)
    hero_image_key: str = Field(min_length=1, max_length=512)
    video_url: str | None = Field(default=None, max_length=2048)

    @field_validator("title", "cuisine", "dish_type", "hero_image_key")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty.")
        return value

    @field_validator("hero_image_key")
    @classmethod
    def validate_photo_key(cls, value: str) -> str:
        if value.startswith(("recipes/", "homepage/", "masalafolder/recipes/")):
            return value
        raise ValueError("Upload the photo to RustFS and provide its image key.")

    @field_validator("slug")
    @classmethod
    def normalize_slug(cls, value: str) -> str:
        normalized = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
        if not normalized:
            raise ValueError("Enter a valid recipe URL slug.")
        return normalized

    @field_validator("ingredients", "steps")
    @classmethod
    def clean_list_items(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip() for value in values if value.strip()]
        if not cleaned:
            raise ValueError("Add at least one item.")
        return cleaned

    @field_validator("video_url")
    @classmethod
    def clean_video_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class PaginatedRecipes(BaseModel):
    items: list[Recipe]
    page: int
    page_size: int
    total_count: int
