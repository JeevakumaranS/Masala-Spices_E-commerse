"""Recipe request and response schemas."""

from uuid import UUID

from pydantic import BaseModel, Field


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
    video_url: str | None = None


class PaginatedRecipes(BaseModel):
    items: list[Recipe]
    page: int
    page_size: int
    total_count: int
