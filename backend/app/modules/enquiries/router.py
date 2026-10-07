"""Persist public enquiries and provide an authenticated message inbox."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import delete, func, insert, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, messages_table
from app.modules.admin.auth import require_admin
from app.modules.enquiries.schemas import MessageInput, MessageStatus, MessageStatusInput, MessageSubject

router = APIRouter(prefix="/api/enquiries", tags=["enquiries"])
admin_router = APIRouter(prefix="/api/admin/messages", tags=["admin-messages"])


@router.post("", status_code=201)
async def create_enquiry(
    payload: MessageInput,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    result = await db.execute(
        insert(messages_table)
        .values(**payload.model_dump(), status=MessageStatus.NEW)
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
            messages_table.c.subject.ilike(pattern),
            messages_table.c.message.ilike(pattern),
        ))

    total_count = await db.scalar(
        select(func.count()).select_from(messages_table).where(*conditions)
    )
    unread_result = await db.execute(
        select(messages_table.c.subject, func.count())
        .where(messages_table.c.status == MessageStatus.NEW)
        .group_by(messages_table.c.subject)
    )
    unread_counts = {
        subject: 0
        for subject in ("General", "Order issue", "Wholesale", "Export", "Bulk orders")
    }
    unread_counts.update({str(subject): int(count) for subject, count in unread_result.all()})
    unread_counts["All"] = sum(unread_counts.values())
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
        "unread_counts": unread_counts,
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


@admin_router.delete("/{message_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_message(
    message_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> Response:
    result = await db.execute(
        delete(messages_table)
        .where(messages_table.c.id == message_id)
    )
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Message not found.")
    await db.commit()
    return Response(status_code=204)
