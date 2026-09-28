"""Category routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import categories_table, get_db
from app.modules.categories.schemas import Category

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[Category])
async def list_categories(db: AsyncSession = Depends(get_db)) -> list[dict]:
    result = await db.execute(select(categories_table).order_by(categories_table.c.name))
    return [dict(row) for row in result.mappings()]


@router.get("/{slug}", response_model=Category)
async def get_category(slug: str, db: AsyncSession = Depends(get_db)) -> dict:
    category = await db.execute(
        select(categories_table).where(categories_table.c.slug == slug)
    )
    category = category.mappings().first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return dict(category)
