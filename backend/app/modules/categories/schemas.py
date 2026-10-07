"""Category request and response schemas."""

from uuid import UUID

from pydantic import BaseModel


class Category(BaseModel):
    id: UUID
    name: str
    slug: str
    type: str = "product_type"
    description: str | None = None
    image_key: str | None = None
    image_url: str | None = None
