"""Product and product-review routes."""

import asyncio
import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import (
    combos_table,
    get_db,
    products_table,
    reviews_table,
    variants_table,
)
from app.services.storage import get_file_url, get_object_key, object_exists
from app.modules.products.schemas import (
    PaginatedProducts,
    Product,
    ProductReview,
    ReviewSubmission,
    ReviewSubmissionResponse,
)

router = APIRouter(prefix="/api/products", tags=["products"])
logger = logging.getLogger(__name__)


@router.get("", response_model=PaginatedProducts, response_model_exclude_none=True)
async def list_products(
    category: str | None = Query(default=None),
    spice_level: str | None = Query(default=None),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    pack_size: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = 1,
    page_size: int = 12,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    product_result = await db.execute(select(products_table).order_by(products_table.c.name))
    combo_result = await db.execute(select(combos_table).order_by(combos_table.c.name))
    filtered = [
        {**dict(row), "is_combo": False}
        for row in product_result.mappings()
    ] + [
        {
            **dict(row),
            "is_combo": True,
            "ingredients": [],
        }
        for row in combo_result.mappings()
    ]
    if category:
        if category == "combos-packs":
            filtered = [item for item in filtered if item.get("is_combo")]
        else:
            filtered = [item for item in filtered if category in (item.get("categories") or [])]
    if spice_level:
        filtered = [item for item in filtered if item["spice_level"].lower() == spice_level.lower()]
    if min_price is not None or max_price is not None:
        regular_ids = [item["id"] for item in filtered if not item["is_combo"]]
        variant_prices: dict[UUID, list[float]] = {}
        if regular_ids:
            result = await db.execute(
                select(variants_table.c.product_id, variants_table.c.price)
                .where(variants_table.c.product_id.in_(regular_ids))
                .order_by(variants_table.c.price)
            )
            for row in result.mappings():
                variant_prices.setdefault(row["product_id"], []).append(float(row["price"]))

        def in_price_range(item: dict[str, Any]) -> bool:
            prices = (
                [float(item["price"])]
                if item["is_combo"]
                else variant_prices.get(item["id"], [])
            )
            return any(
                (min_price is None or price >= min_price)
                and (max_price is None or price <= max_price)
                for price in prices
            )

        filtered = [item for item in filtered if in_price_range(item)]
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
                item["name"], item["description"], item.get("spice_level") or "",
                *(item.get("categories") or []),
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


@router.get("/{slug}", response_model=Product, response_model_exclude_none=True)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    result = await db.execute(select(products_table).where(products_table.c.slug == slug))
    product = result.mappings().first()
    if product is not None:
        item = {**dict(product), "is_combo": False}
    else:
        result = await db.execute(select(combos_table).where(combos_table.c.slug == slug))
        combo = result.mappings().first()
        if combo is None:
            raise HTTPException(status_code=404, detail="Product not found")
        item = {**dict(combo), "is_combo": True, "ingredients": []}
    return (await hydrate_products(db, [item]))[0]


async def hydrate_products(db: AsyncSession, products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not products:
        return []
    ids = [item["id"] for item in products if not item.get("is_combo")]
    result = await db.execute(
    select(variants_table)
    .where(variants_table.c.product_id.in_(ids))
    .order_by(variants_table.c.price, variants_table.c.pack_size)
    ) if ids else None
    variants_by_product: dict[str, list[dict[str, Any]]] = {}
    if result is not None:
        for row in result.mappings():
            variant = dict(row)
            if variant.get("expiry_date"):
                variant["expiry_date"] = variant["expiry_date"].isoformat()
            variants_by_product.setdefault(row["product_id"], []).append(variant)

    combo_ids = [item["id"] for item in products if item.get("is_combo")]
    combo_catalog_products_by_id: dict[UUID, list[dict[str, Any]]] = {}
    if combo_ids:
        components_by_combo = {
            item["id"]: item.get("catalog_products") or []
            for item in products
            if item.get("is_combo")
        }
        variant_ids = {
            UUID(component["variant_id"])
            for components in components_by_combo.values()
            for component in components
        }
        catalog_rows_by_variant: dict[UUID, dict[str, Any]] = {}
        if variant_ids:
            catalog_result = await db.execute(
                select(
                    variants_table.c.id,
                    variants_table.c.product_id,
                    products_table.c.name,
                    variants_table.c.sku,
                    variants_table.c.pack_size,
                    variants_table.c.price,
                    variants_table.c.mrp,
                    variants_table.c.stock_qty,
                )
                .join(products_table, products_table.c.id == variants_table.c.product_id)
                .where(variants_table.c.id.in_(variant_ids))
            )
            catalog_rows_by_variant = {
                row["id"]: dict(row) for row in catalog_result.mappings()
            }
        for combo_id, components in components_by_combo.items():
            for component in components:
                variant_id = UUID(component["variant_id"])
                row = catalog_rows_by_variant.get(variant_id)
                if row is None or str(row["product_id"]) != component["product_id"]:
                    continue
                combo_catalog_products_by_id.setdefault(combo_id, []).append({
                    "id": UUID(component["id"]),
                    "product_id": row["product_id"],
                    "variant_id": variant_id,
                    "name": row["name"],
                    "sku": row["sku"],
                    "quantity": int(component["quantity"]),
                    "pack_size": row["pack_size"],
                    "price": float(row["price"]),
                    "mrp": float(row["mrp"]),
                    "stock_qty": int(row["stock_qty"]),
                })
    for product in products:
        product["is_combo"] = bool(product.get("is_combo", False))
        product["variants"] = variants_by_product.get(product["id"], [])
        product["combo_catalog_products"] = combo_catalog_products_by_id.get(product["id"], [])
        product["categories"] = product.get("categories") or []
        image_references = product.get("images") or []
        product["images"] = []
        for image in image_references:
            if not isinstance(image, str):
                logger.warning(
                    "Skipping non-string product image reference.",
                    extra={"product_id": str(product["id"]), "image_type": type(image).__name__},
                )
                continue
            object_key = get_object_key(image)
            if not object_key:
                logger.warning(
                    "Skipping product image that is not stored in RustFS.",
                    extra={"product_id": str(product["id"])},
                )
                continue
            if (
                image != object_key
                and not await asyncio.to_thread(object_exists, object_key)
            ):
                logger.warning(
                    "Skipping legacy product image reference whose RustFS object is missing.",
                    extra={"product_id": str(product["id"]), "object_key": object_key},
                )
                continue
            sort_order = len(product["images"])
            product["images"].append({
                "id": f"{product['id']}:{sort_order}",
                "url": await asyncio.to_thread(get_file_url, object_key),
                "object_key": object_key,
                "alt_text": product["name"],
                "sort_order": sort_order,
                "image_type": "pack_shot" if sort_order == 0 else "gallery",
            })
    return products


@router.get("/{product_id}/reviews")
async def get_product_reviews(
    product_id: UUID,
    limit: int = Query(default=3, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    product = await db.execute(select(products_table.c.id).where(products_table.c.id == product_id))
    is_combo = product.scalar_one_or_none() is None
    if is_combo:
        combo = await db.execute(select(combos_table.c.id).where(combos_table.c.id == product_id))
        if combo.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Product not found")

    target_filter = (
        reviews_table.c.combo_id == product_id
        if is_combo
        else reviews_table.c.product_id == product_id
    )
    filters = (target_filter, reviews_table.c.status == "approved")
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
    is_combo = product.scalar_one_or_none() is None
    if is_combo:
        combo = await db.execute(select(combos_table.c.id).where(combos_table.c.id == product_id))
        if combo.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Product not found")
    if is_combo:
        product_values = {"combo_id": product_id, "product_id": None}
    else:
        product_values = {"product_id": product_id, "combo_id": None}
    product_values.update({
        "reviewer_name": payload.reviewer_name.strip(),
        "rating": payload.rating,
        "comment": payload.comment.strip(),
        "status": "pending",
    })
    result = await db.execute(
        insert(reviews_table).values(**product_values).returning(reviews_table.c.id)
    )
    await db.commit()
    return {
        "status": "pending_moderation",
        "id": result.scalar_one(),
        "product_id": None if is_combo else product_id,
        "combo_id": product_id if is_combo else None,
    }
