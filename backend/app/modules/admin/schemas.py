"""Admin authentication schemas."""

import re
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.modules.analytics.schemas import AnalyticsSummary


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=12, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().casefold()


class RegisterAdminRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().casefold()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", normalized):
            raise ValueError("Enter a valid email address.")
        return normalized


class AdminOverviewData(BaseModel):
    products: list[dict[str, Any]] | None = None
    categories: list[dict[str, Any]] | None = None
    orders: list[dict[str, Any]] | None = None
    coupons: list[dict[str, Any]] | None = None
    reviews: list[dict[str, Any]] | None = None
    hero_images: list[dict[str, Any]] | None = None
    analytics: AnalyticsSummary | None = None


class AdminOverviewResponse(BaseModel):
    data: AdminOverviewData
    errors: dict[str, str]
