"""Order request and response schemas."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

DeliveryMode = Literal["domestic", "international"]


class OrderItemInput(BaseModel):
    product_id: int = Field(gt=0)
    variant_id: int | None = Field(default=None, ge=0)
    qty: int = Field(ge=1, le=20)

    @field_validator("variant_id", mode="before")
    @classmethod
    def normalize_zero_variant(cls, value: Any) -> Any:
        # Older storefronts used 0 to mean "no selected variant".
        return None if value == 0 else value


class OrderCreateRequest(BaseModel):
    customer_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=7, max_length=24)
    email: str | None = Field(default=None, max_length=254)
    address_line: str = Field(min_length=6, max_length=300)
    city: str = Field(min_length=2, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    postal_code: str = Field(min_length=3, max_length=16)
    country_code: str = Field(default="IN", min_length=2, max_length=2)
    delivery_mode: DeliveryMode = "domestic"
    coupon_code: str | None = Field(default=None, max_length=40)
    items: list[OrderItemInput] = Field(min_length=1, max_length=50)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return None
        local, separator, domain = normalized.partition("@")
        if not separator or not local or "." not in domain or domain.startswith(".") or domain.endswith("."):
            raise ValueError("Enter a valid email address or leave it blank.")
        return normalized

    @field_validator("country_code", "coupon_code")
    @classmethod
    def normalize_codes(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip().upper()


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
    payment_status: str = "pending_offline"
    total: float
    subtotal: float
    shipping_amount: float = 0
    discount_amount: float = 0
    coupon_code: str | None = None
    delivery_mode: DeliveryMode = "domestic"
    country_code: str = "IN"
    shipping_note: str | None = None
    created_at: datetime
    item_count: int = 0
    items: list[dict[str, Any]] = Field(default_factory=list)
    address_line: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    history: list[OrderStatusHistory] = Field(default_factory=list)
