"""Recipe routes."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, recipes_table
from app.modules.recipes.schemas import PaginatedRecipes, Recipe

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


@router.get("", response_model=PaginatedRecipes)
async def list_recipes(
    cuisine: str | None = None,
    dish_type: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    query = select(recipes_table).order_by(recipes_table.c.id)
    result = await db.execute(query)
    filtered = [dict(row) for row in result.mappings()]
    if cuisine:
        filtered = [item for item in filtered if item["cuisine"].lower() == cuisine.lower()]
    if dish_type:
        filtered = [
            item
            for item in filtered
            if item["dish_type"].lower() == dish_type.lower()
        ]
    return {
        "items": filtered,
        "page": 1,
        "page_size": len(filtered),
        "total_count": len(filtered),
    }


@router.get("/{slug}", response_model=Recipe)
async def get_recipe(slug: str, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    result = await db.execute(select(recipes_table).where(recipes_table.c.slug == slug))
    recipe = result.mappings().first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return dict(recipe)
