from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class Category(BaseModel):
    id: int
    name: str
    slug: str
    type: str = "product_type"
    description: str | None = None


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
    created_at: datetime | None = None
    updated_at: datetime | None = None


class Recipe(BaseModel):
    id: int
    title: str
    slug: str
    cook_time_minutes: int
    cuisine: str
    dish_type: str
    ingredients: List[str] = Field(default_factory=list)
    steps: List[str] = Field(default_factory=list)
    hero_image_url: str
    video_url: str | None = None


class OrderStatusHistory(BaseModel):
    id: int
    status: str
    changed_at: datetime
    note: str | None = None


class Order(BaseModel):
    id: int
    order_number: str
    customer_name: str
    phone: str
    email: str | None = None
    status: str = "placed"
    total: float
    subtotal: float
    shipping_amount: float = 0
    discount_amount: float = 0
    created_at: datetime
    item_count: int = 0
    history: List[OrderStatusHistory] = Field(default_factory=list)


class AnalyticsSummary(BaseModel):
    total_revenue: float
    orders_count: int
    top_items: List[str]
    avg_order_value: float
