"""Public and admin blog post routes."""

import asyncio
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import blog_posts_table, get_db
from app.modules.admin.auth import require_admin
from app.modules.blog.schemas import BlogPostInput
from app.services.storage import get_file_url, object_exists

router = APIRouter(prefix="/api/blog", tags=["blog"])
admin_router = APIRouter(prefix="/api/admin/blog", tags=["admin-blog"])


async def _blog_post_response(post: dict[str, Any]) -> dict[str, Any]:
    image_reference = post["hero_image_url"]
    if image_reference.startswith("homepage/"):
        post["hero_image_key"] = image_reference
        if not await asyncio.to_thread(object_exists, image_reference):
            raise HTTPException(
                status_code=502,
                detail="A blog photo is missing from RustFS. Upload that photo again.",
            )
        post["hero_image_url"] = await asyncio.to_thread(get_file_url, image_reference)
    return post


@router.get("", response_model=list[dict[str, Any]])
async def list_blog_posts(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    result = await db.execute(
        select(
            blog_posts_table.c.id,
            blog_posts_table.c.title,
            blog_posts_table.c.slug,
            blog_posts_table.c.category,
            blog_posts_table.c.published_at,
            blog_posts_table.c.hero_image_url,
        )
        .where(blog_posts_table.c.status == "published")
        .order_by(blog_posts_table.c.published_at.desc(), blog_posts_table.c.created_at.desc())
    )
    return [await _blog_post_response(dict(row)) for row in result.mappings()]


@router.get("/{slug}")
async def get_blog_post(slug: str, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    result = await db.execute(
        select(blog_posts_table).where(
            blog_posts_table.c.slug == slug,
            blog_posts_table.c.status == "published",
        )
    )
    post = result.mappings().first()
    if post is None:
        raise HTTPException(status_code=404, detail="Blog post not found.")
    return await _blog_post_response(dict(post))


@admin_router.get("", dependencies=[Depends(require_admin)])
async def admin_blog_posts(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    result = await db.execute(
        select(blog_posts_table).order_by(
            blog_posts_table.c.created_at.desc(),
            blog_posts_table.c.title,
        )
    )
    return [await _blog_post_response(dict(row)) for row in result.mappings()]


@admin_router.post("", status_code=201, dependencies=[Depends(require_admin)])
async def create_blog_post(
    payload: BlogPostInput,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    try:
        result = await db.execute(
            insert(blog_posts_table)
            .values(**payload.model_dump())
            .returning(blog_posts_table)
        )
        post = dict(result.mappings().one())
        await db.commit()
        return post
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A blog post with that slug already exists.") from exc


@admin_router.put("/{post_id}", dependencies=[Depends(require_admin)])
async def update_blog_post(
    post_id: UUID,
    payload: BlogPostInput,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    try:
        result = await db.execute(
            update(blog_posts_table)
            .where(blog_posts_table.c.id == post_id)
            .values(**payload.model_dump(), updated_at=datetime.now(timezone.utc))
            .returning(blog_posts_table)
        )
        post = result.mappings().first()
        if post is None:
            raise HTTPException(status_code=404, detail="Blog post not found.")
        await db.commit()
        return dict(post)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A blog post with that slug already exists.") from exc


@admin_router.delete("/{post_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_blog_post(post_id: UUID, db: AsyncSession = Depends(get_db)) -> None:
    result = await db.execute(
        delete(blog_posts_table).where(blog_posts_table.c.id == post_id)
    )
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Blog post not found.")
    await db.commit()
