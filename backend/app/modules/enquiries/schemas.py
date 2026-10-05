"""Validated contact and bulk-order message contracts."""

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

MessageSubject = Literal["General", "Order issue", "Wholesale", "Export", "Bulk orders"]
MessageSource = Literal["contact", "bulk_order"]


class MessageInput(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: str = Field(min_length=3, max_length=254)
    phone: str | None = Field(default=None, max_length=24)
    company_name: str | None = Field(default=None, max_length=255)
    subject: MessageSubject
    message: str = Field(min_length=10, max_length=3000)
    source: MessageSource = "contact"
    details: dict[str, Any] = Field(default_factory=dict)

    @field_validator("name", "message")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty.")
        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().casefold()
        local, separator, domain = normalized.partition("@")
        if not separator or not local or "." not in domain or domain.startswith(".") or domain.endswith("."):
            raise ValueError("Enter a valid email address.")
        return normalized

    @field_validator("phone", "company_name")
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @model_validator(mode="after")
    def validate_source_fields(self) -> "MessageInput":
        if self.source == "bulk_order":
            if self.subject != "Bulk orders":
                raise ValueError("Bulk-order messages must use the Bulk orders subject.")
            if not self.company_name or not self.phone:
                raise ValueError("Bulk-order messages need a company name and phone number.")
        elif self.subject == "Bulk orders":
            raise ValueError("Use the bulk-order form for Bulk orders messages.")
        return self


class MessageStatusInput(BaseModel):
    status: Literal["new", "read"]
