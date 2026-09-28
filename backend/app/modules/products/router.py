"""Product and product-review routes."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, products_table, reviews_table, variants_table
from app.modules.products.schemas import (
    PaginatedProducts,
    Product,
    ProductReview,
    ReviewSubmission,
    ReviewSubmissionResponse,
)

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=PaginatedProducts)
async def list_products(
    category: str | None = Query(default=None),
    spice_level: str | None = Query(default=None),
    dish_type: str | None = Query(default=None),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    pack_size: str | None = Query(default=None),
    is_veg: bool | None = Query(default=None),
    contains_ginger_garlic: bool | None = Query(default=None),
    contains_tamarind: bool | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = 1,
    page_size: int = 12,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(select(products_table).order_by(products_table.c.name))
    filtered = [dict(row) for row in result.mappings()]
    if category:
        filtered = [item for item in filtered if category in (item.get("categories") or [])]
    if spice_level:
        filtered = [item for item in filtered if item["spice_level"].lower() == spice_level.lower()]
    if dish_type:
        filtered = [item for item in filtered if (item.get("dish_type") or "").lower() == dish_type.lower()]
    if min_price is not None:
        filtered = [item for item in filtered if float(item["price"]) >= min_price]
    if max_price is not None:
        filtered = [item for item in filtered if float(item["price"]) <= max_price]
    if is_veg is not None:
        filtered = [item for item in filtered if item.get("is_veg", True) == is_veg]
    if contains_ginger_garlic is not None:
        filtered = [item for item in filtered if item.get("contains_ginger_garlic", False) == contains_ginger_garlic]
    if contains_tamarind is not None:
        filtered = [item for item in filtered if item.get("contains_tamarind", False) == contains_tamarind]
    if pack_size:
        variants = await db.execute(
            select(variants_table.c.product_id).where(variants_table.c.pack_size.ilike(f"%{pack_size}%"))
        )
        matching_ids = {row[0] for row in variants}
        filtered = [item for item in filtered if item["id"] in matching_ids]
    if search:
        needle = search.lower().strip()
        filtered = [
            item for item in filtered
            if needle in " ".join([
                item["name"], item["description"], item.get("dish_type") or "",
                *(item.get("categories") or []), *(item.get("ingredients") or []),
            ]).lower()
        ]
    start = (page - 1) * page_size
    end = start + page_size
    items = await hydrate_products(db, filtered[start:end])
    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total_count": len(filtered),
    }


@router.get("/{slug}", response_model=Product)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    result = await db.execute(select(products_table).where(products_table.c.slug == slug))
    product = result.mappings().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return (await hydrate_products(db, [dict(product)]))[0]


async def hydrate_products(db: AsyncSession, products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not products:
        return []
    ids = [item["id"] for item in products]
    result = await db.execute(
        select(variants_table).where(variants_table.c.product_id.in_(ids))
    )
    variants_by_product: dict[str, list[dict[str, Any]]] = {}
    for row in result.mappings():
        variant = dict(row)
        if variant.get("expiry_date"):
            variant["expiry_date"] = variant["expiry_date"].isoformat()
        variants_by_product.setdefault(row["product_id"], []).append(variant)
    for product in products:
        product["variants"] = variants_by_product.get(product["id"], [])
        product["ingredients"] = product.get("ingredients") or []
        product["categories"] = product.get("categories") or []
        product["images"] = [
            {
                "id": f"{product['id']}:{index}",
                "url": image,
                "alt_text": product["name"],
                "sort_order": index,
                "image_type": "pack_shot" if index == 0 else "gallery",
            }
            for index, image in enumerate(product.get("images") or [])
        ]
    return products


@router.get("/{product_id}/reviews")
async def get_product_reviews(
    product_id: UUID,
    limit: int = Query(default=3, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    product = await db.execute(select(products_table.c.id).where(products_table.c.id == product_id))
    if product.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Product not found")

    filters = (reviews_table.c.product_id == product_id, reviews_table.c.status == "approved")
    summary = await db.execute(
        select(
            func.count(reviews_table.c.id),
            func.avg(reviews_table.c.rating),
        ).where(*filters)
    )
    total_count, average_rating = summary.one()

    result = await db.execute(
        select(reviews_table)
        .where(*filters)
        .order_by(reviews_table.c.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return {
        "items": [dict(row) for row in result.mappings()],
        "total_count": total_count,
        "average_rating": float(average_rating) if average_rating is not None else 0,
    }


@router.post("/{product_id}/reviews", response_model=ReviewSubmissionResponse)
async def submit_review(
    product_id: UUID,
    payload: ReviewSubmission,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    product = await db.execute(select(products_table.c.id).where(products_table.c.id == product_id))
    if product.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Product not found")
    result = await db.execute(
        insert(reviews_table).values(
            product_id=product_id,
            reviewer_name=payload.reviewer_name.strip(),
            rating=payload.rating,
            comment=payload.comment.strip(),
            status="pending",
        ).returning(reviews_table.c.id)
    )
    await db.commit()
    return {"status": "pending_moderation", "id": result.scalar_one(), "product_id": product_id}
