"""Persist public enquiries and provide an authenticated message inbox."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, insert, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, messages_table
from app.modules.admin.auth import require_admin
from app.modules.enquiries.schemas import MessageInput, MessageStatusInput, MessageSubject

router = APIRouter(prefix="/api/enquiries", tags=["enquiries"])
admin_router = APIRouter(prefix="/api/admin/messages", tags=["admin-messages"])


@router.post("", status_code=201)
async def create_enquiry(
    payload: MessageInput,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    result = await db.execute(
        insert(messages_table)
        .values(**payload.model_dump(), status="new")
        .returning(messages_table.c.id)
    )
    message_id = result.scalar_one()
    await db.commit()
    return {
        "id": str(message_id),
        "status": "queued",
        "message": "Thank you. Your message has been received.",
    }


@admin_router.get("", dependencies=[Depends(require_admin)])
async def list_messages(
    subject: MessageSubject | None = Query(default=None),
    search: str | None = Query(default=None, max_length=120),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    conditions = []
    if subject:
        conditions.append(messages_table.c.subject == subject)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        conditions.append(or_(
            messages_table.c.name.ilike(pattern),
            messages_table.c.email.ilike(pattern),
            messages_table.c.phone.ilike(pattern),
            messages_table.c.company_name.ilike(pattern),
            messages_table.c.subject.ilike(pattern),
            messages_table.c.message.ilike(pattern),
        ))

    total_count = await db.scalar(
        select(func.count()).select_from(messages_table).where(*conditions)
    )
    result = await db.execute(
        select(messages_table)
        .where(*conditions)
        .order_by(messages_table.c.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return {
        "items": [dict(row) for row in result.mappings()],
        "page": page,
        "page_size": page_size,
        "total_count": int(total_count or 0),
    }


@admin_router.patch("/{message_id}", dependencies=[Depends(require_admin)])
async def update_message_status(
    message_id: UUID,
    payload: MessageStatusInput,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(
        update(messages_table)
        .where(messages_table.c.id == message_id)
        .values(status=payload.status)
        .returning(messages_table)
    )
    message = result.mappings().first()
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found.")
    await db.commit()
    return dict(message)
