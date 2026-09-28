"""Product request and response schemas."""

from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class ProductImage(BaseModel):
    id: int
    url: str
    alt_text: str
    sort_order: int = 0
    image_type: str = "pack_shot"


class ProductVariant(BaseModel):
    id: int
    pack_size: str
    price: float
    mrp: float
    stock_qty: int = 0
    sku: str
    expiry_date: str | None = None


class Product(BaseModel):
    id: int
    name: str
    slug: str
    description: str
    ingredients: List[str] = Field(default_factory=list)
    price: float
    mrp: float
    discount_pct: int = 0
    spice_level: str = "mild"
    status: str = "active"
    variants: List[ProductVariant] = Field(default_factory=list)
    images: List[ProductImage] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list)
    dish_type: str | None = None
    is_veg: bool = True
    contains_ginger_garlic: bool = False
    contains_tamarind: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PaginatedProducts(BaseModel):
    items: list[Product]
    page: int
    page_size: int
    total_count: int


class ReviewSubmission(BaseModel):
    reviewer_name: str
    rating: int = Field(ge=1, le=5)
    comment: str
