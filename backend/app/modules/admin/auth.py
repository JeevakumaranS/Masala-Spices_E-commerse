"""Environment-configured single-admin login and signed bearer tokens."""

import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import admin_users_table, get_db

bearer = HTTPBearer(auto_error=False)
_PASSWORD_SCRYPT_N = 2**14
_JWT_ALGORITHM = "HS256"


def _token_expiration_minutes() -> int:
    raw_value = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    try:
        minutes = int(raw_value)
    except ValueError as error:
        raise HTTPException(
            status_code=503,
            detail="ACCESS_TOKEN_EXPIRE_MINUTES must be a positive integer.",
        ) from error
    if minutes <= 0:
        raise HTTPException(
            status_code=503,
            detail="ACCESS_TOKEN_EXPIRE_MINUTES must be a positive integer.",
        )
    return minutes


def _secret() -> str:
    secret = os.getenv("ADMIN_TOKEN_SECRET")
    if not secret or len(secret) < 32:
        raise HTTPException(status_code=503, detail="Admin authentication is not configured.")
    return secret


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=_PASSWORD_SCRYPT_N,
        r=8,
        p=1,
        dklen=32,
    )
    return "scrypt${}${}${}${}${}".format(
        _PASSWORD_SCRYPT_N,
        8,
        1,
        base64.urlsafe_b64encode(salt).decode("ascii"),
        base64.urlsafe_b64encode(digest).decode("ascii"),
    )


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, n_value, r_value, p_value, salt_value, digest_value = encoded.split("$")
        if algorithm != "scrypt":
            return False
        n, r, p = int(n_value), int(r_value), int(p_value)
        if n != _PASSWORD_SCRYPT_N or r != 8 or p != 1:
            return False
        salt = base64.urlsafe_b64decode(salt_value.encode("ascii"))
        expected = base64.urlsafe_b64decode(digest_value.encode("ascii"))
        actual = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=n,
            r=r,
            p=p,
            dklen=len(expected),
        )
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError, UnicodeError):
        return False


def issue_token(email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": email.strip().casefold(),
        "iat": now,
        "exp": now + timedelta(minutes=_token_expiration_minutes()),
    }
    return jwt.encode(payload, _secret(), algorithm=_JWT_ALGORITHM)


async def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Admin authentication required.")
    try:
        payload = jwt.decode(
            credentials.credentials,
            _secret(),
            algorithms=[_JWT_ALGORITHM],
        )
        subject = payload.get("sub")
        if not isinstance(subject, str) or not subject.strip():
            raise ValueError("JWT subject is missing.")
        email = subject.strip().casefold()
        result = await db.execute(
            select(admin_users_table.c.id).where(
                admin_users_table.c.email == email,
                admin_users_table.c.is_active.is_(True),
            )
        )
        if result.scalar_one_or_none() is None:
            raise ValueError
        return email
    except HTTPException:
        raise
    except (JWTError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid or expired admin token.")
