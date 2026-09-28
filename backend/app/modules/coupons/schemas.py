"""Coupon validation request and response contracts."""

from pydantic import BaseModel, Field

from app.modules.orders.schemas import OrderItemInput


class CouponValidateRequest(BaseModel):
    code: str = Field(min_length=1, max_length=40)
    items: list[OrderItemInput] = Field(min_length=1)
    phone: str | None = None
    email: str | None = None


class CouponValidationResponse(BaseModel):
    valid: bool
    code: str
    kind: str | None = None
    type: str | None = None
    label: str | None = None
    message: str | None = None
    discount: float = 0
    first_order_only: bool = False
