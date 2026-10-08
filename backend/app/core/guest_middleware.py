"""Create and track anonymous storefront guest identities."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.dialects.postgresql import insert
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.database import guest_sessions_table, session_factory, _uuid7_default

GUEST_IDENTITY_ROUTES = {
    ("/api/guest/session", "GET"),
    ("/api/cart", "GET"),
    ("/api/cart", "PUT"),
    ("/api/watchlist", "GET"),
    ("/api/watchlist", "PUT"),
    ("/api/orders", "POST"),
}


class GuestIdentityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path.rstrip("/")
        if (path, request.method) not in GUEST_IDENTITY_ROUTES:
            return await call_next(request)

        raw_guest_id = request.cookies.get("guest_id")
        try:
            guest_id = UUID(raw_guest_id) if raw_guest_id else _uuid7_default()
        except ValueError:
            guest_id = _uuid7_default()

        now = datetime.now(timezone.utc)
        async with session_factory() as db:
            statement = insert(guest_sessions_table).values(
                guest_id=guest_id,
                created_at=now,
                last_seen_at=now,
            )
            await db.execute(
                statement.on_conflict_do_update(
                    index_elements=[guest_sessions_table.c.guest_id],
                    set_={"last_seen_at": now},
                )
            )
            await db.commit()

        request.state.guest_id = guest_id
        response = await call_next(request)
        if raw_guest_id is None or str(guest_id) != raw_guest_id:
            response.set_cookie(
                "guest_id",
                str(guest_id),
                max_age=180 * 24 * 60 * 60,
                httponly=True,
                secure=os.getenv("APP_ENV", "").lower() in {"prod", "production"},
                samesite="lax",
                path="/",
            )
        return response
