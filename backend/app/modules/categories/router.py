"""Category routes."""

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import categories_table, get_db
from app.modules.categories.schemas import Category
from app.services.storage import get_file_url

router = APIRouter(prefix="/api/categories", tags=["categories"])


async def category_response(row: object) -> dict:
    category = dict(row)
    image_key = category.get("image_key")
    category["image_url"] = (
        await asyncio.to_thread(get_file_url, image_key)
        if image_key
        else None
    )
    return category


@router.get("", response_model=list[Category])
async def list_categories(
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    response.headers["Cache-Control"] = (
        "public, max-age=0, s-maxage=60, stale-while-revalidate=300"
    )
    result = await db.execute(select(categories_table).order_by(categories_table.c.name))
    return await asyncio.gather(*(category_response(row) for row in result.mappings()))


@router.get("/{slug}", response_model=Category)
async def get_category(slug: str, db: AsyncSession = Depends(get_db)) -> dict:
    category = await db.execute(
        select(categories_table).where(categories_table.c.slug == slug)
    )
    category = category.mappings().first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return await category_response(category)
