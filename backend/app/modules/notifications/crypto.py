"""Encryption helpers for notification provider credentials."""

import base64
import hashlib
import os

from cryptography.fernet import Fernet
from fastapi import HTTPException
from cryptography.fernet import InvalidToken


def integration_settings_cipher() -> Fernet:
    secret = os.getenv("ADMIN_TOKEN_SECRET", "")
    if len(secret) < 32:
        raise HTTPException(
            status_code=503,
            detail="Admin settings encryption is not configured.",
        )
    key_material = hashlib.sha256(
        b"masala-admin-integration-settings:" + secret.encode("utf-8")
    ).digest()
    return Fernet(base64.urlsafe_b64encode(key_material))


def decrypt_integration_secret(value: str) -> str:
    return integration_settings_cipher().decrypt(value.encode("ascii")).decode("utf-8")


__all__ = ["InvalidToken", "decrypt_integration_secret", "integration_settings_cipher"]
