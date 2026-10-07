"""Public newsletter signup endpoint."""

import logging
import re
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, updates_table
from app.modules.notifications.brevo import send_newsletter_signup_email

router = APIRouter(prefix="/api/updates", tags=["updates"])
logger = logging.getLogger(__name__)
_SIGNUP_LIMIT = 10
_SIGNUP_WINDOW_SECONDS = 60 * 60
_signup_attempts: dict[str, deque[float]] = defaultdict(deque)


class NewsletterSignup(BaseModel):
    email: str = Field(min_length=3, max_length=254)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().casefold()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]{2,}", normalized):
            raise ValueError("Enter a valid email address.")
        return normalized


class NewsletterSignupResponse(BaseModel):
    subscribed: bool
    email_status: Literal["sent", "already_sent", "failed", "disabled"]


def _enforce_signup_limit(client_ip: str) -> None:
    now = time.monotonic()
    attempts = _signup_attempts[client_ip]
    while attempts and now - attempts[0] >= _SIGNUP_WINDOW_SECONDS:
        attempts.popleft()
    if len(attempts) >= _SIGNUP_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Too many signup attempts. Please try again later.",
        )
    attempts.append(now)


@router.post("", response_model=NewsletterSignupResponse)
async def signup_for_updates(
    payload: NewsletterSignup,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    client_ip = request.client.host if request.client else "unknown"
    _enforce_signup_limit(client_ip)

    try:
        await db.execute(
            pg_insert(updates_table)
            .values(
                email=payload.email,
                created_at=datetime.now(timezone.utc),
            )
            .on_conflict_do_nothing(index_elements=[updates_table.c.email])
        )
        result = await db.execute(
            select(
                updates_table.c.id,
                updates_table.c.confirmation_sent_at,
            )
            .where(updates_table.c.email == payload.email)
            .with_for_update()
        )
        subscription = result.mappings().first()
        if subscription is None:
            raise RuntimeError("Newsletter signup was not persisted.")

        email_status: Literal["sent", "already_sent", "failed", "disabled"] = "already_sent"
        if subscription["confirmation_sent_at"] is None:
            logger.info("Attempting Brevo newsletter confirmation delivery.")
            email_status = await send_newsletter_signup_email(payload.email)
            if email_status == "sent":
                await db.execute(
                    update(updates_table)
                    .where(updates_table.c.id == subscription["id"])
                    .values(confirmation_sent_at=datetime.now(timezone.utc))
                )
        else:
            logger.info("Skipping newsletter confirmation; it was previously sent.")
        await db.commit()
        logger.info(
            "Newsletter signup completed with confirmation status: %s.",
            email_status,
        )
    except Exception:
        await db.rollback()
        logger.exception("Newsletter signup could not be stored.")
        raise

    return {"subscribed": True, "email_status": email_status}
