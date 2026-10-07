"""Validated input for admin-managed blog posts."""

import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class BlogPostInput(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=120)
    published_at: date
    hero_image_key: str = Field(min_length=1, max_length=512)
    body: str = Field(min_length=1, max_length=100000)
    status: Literal["draft", "published"] = "draft"

    @field_validator("title", "category", "hero_image_key", "body")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty.")
        return value

    @field_validator("slug")
    @classmethod
    def normalize_slug(cls, value: str) -> str:
        normalized = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
        if not normalized:
            raise ValueError("Enter a valid blog URL slug.")
        return normalized

    @field_validator("hero_image_key")
    @classmethod
    def validate_hero_image_key(cls, value: str) -> str:
        if value.startswith(("blog/", "homepage/", "masalafolder/blog/")):
            return value
        raise ValueError("Upload the photo to RustFS and provide its image key.")
