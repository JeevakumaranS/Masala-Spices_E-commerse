"""Validated contact and bulk-order message contracts."""

from enum import Enum

from pydantic import BaseModel, Field, field_validator

MessageSubject = str


class MessageInput(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: str = Field(min_length=3, max_length=254)
    phone: str = Field(min_length=7, max_length=24)
    subject: MessageSubject = Field(min_length=1, max_length=80)
    message: str = Field(min_length=10, max_length=3000)

    @field_validator("name", "message", "subject")
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

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 7:
            raise ValueError("Enter a valid phone number.")
        return normalized


class MessageStatus(str, Enum):
    NEW = "new"
    READ = "read"


class MessageStatusInput(BaseModel):
    status: MessageStatus
