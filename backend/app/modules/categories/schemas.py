"""Category request and response schemas."""

from pydantic import BaseModel


class Category(BaseModel):
    id: int
    name: str
    slug: str
    type: str = "product_type"
    description: str | None = None
