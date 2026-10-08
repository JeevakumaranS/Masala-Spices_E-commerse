"""Anonymous guest cart and watchlist persistence."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import (
    combos_table,
    get_db,
    guest_cart_items_table,
    guest_watchlist_items_table,
    products_table,
)
from app.modules.orders.catalog import CatalogValidationError, quote_order_items
from app.modules.orders.schemas import OrderItemInput
from app.modules.products.router import hydrate_products

router = APIRouter(tags=["guest"])
_NO_VARIANT = UUID("00000000-0000-0000-0000-000000000000")


class CartItemInput(BaseModel):
    product_id: UUID
    variant_id: UUID | None = None
    qty: int = Field(ge=1, le=20)


class CartSyncRequest(BaseModel):
    items: list[CartItemInput] = Field(max_length=100)


class WatchlistSyncRequest(BaseModel):
    slugs: list[str] = Field(max_length=500)


def _guest_id(request: Request) -> UUID:
    return request.state.guest_id


@router.get("/api/guest/session", status_code=204)
async def establish_guest_session() -> Response:
    return Response(status_code=204)


async def _read_cart(db: AsyncSession, guest_id: UUID) -> list[dict[str, Any]]:
    stored_result = await db.execute(
        select(guest_cart_items_table)
        .where(guest_cart_items_table.c.guest_id == guest_id)
        .order_by(guest_cart_items_table.c.position)
    )
    stored_items = [dict(row) for row in stored_result.mappings()]
    if not stored_items:
        return []

    product_ids = {item["product_id"] for item in stored_items}
    regular_result = await db.execute(
        select(products_table).where(products_table.c.id.in_(product_ids))
    )
    regular = {
        row["id"]: {**dict(row), "is_combo": False}
        for row in regular_result.mappings()
    }
    combo_result = await db.execute(
        select(combos_table).where(combos_table.c.id.in_(product_ids))
    )
    combos = {
        row["id"]: {**dict(row), "is_combo": True, "ingredients": []}
        for row in combo_result.mappings()
    }
    catalog = {**regular, **combos}
    hydrated = {
        item["id"]: item
        for item in await hydrate_products(db, list(catalog.values()))
    }

    lines: list[dict[str, Any]] = []
    for saved in stored_items:
        product = hydrated.get(saved["product_id"])
        if product is None or bool(product["is_combo"]) != bool(saved["is_combo"]):
            continue
        variant = next(
            (
                item for item in product["variants"]
                if item["id"] == saved["variant_id"]
            ),
            None,
        ) if saved["variant_id"] else None
        if not product["is_combo"] and variant is None:
            continue
        if product["is_combo"]:
            components = product.get("combo_catalog_products") or []
            max_qty = min(
                (int(item["stock_qty"]) // int(item["quantity"]) for item in components),
                default=0,
            )
        else:
            max_qty = int(variant["stock_qty"])
        lines.append({
            "key": f'{product["id"]}:{variant["id"] if variant else "default"}',
            "id": str(product["id"]),
            "variantId": str(variant["id"]) if variant else None,
            "isCombo": bool(product["is_combo"]),
            "name": product["name"],
            "slug": product["slug"],
            "category": (product.get("categories") or ["all"])[0],
            "categories": product.get("categories") or [],
            "dishType": product.get("dish_type") if product["is_combo"] else None,
            "image": product["images"][0]["url"] if product.get("images") else "",
            "packSize": variant["pack_size"] if variant else "Standard",
            "price": float(variant["price"] if variant else product["price"]),
            "mrp": float(variant["mrp"] if variant else product.get("mrp") or product["price"]),
            "qty": int(saved["qty"]),
            "maxQty": max(0, min(max_qty, 20)),
        })
    return lines


@router.get("/api/cart")
async def get_cart(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    return await _read_cart(db, _guest_id(request))


@router.put("/api/cart")
async def sync_cart(
    payload: CartSyncRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    guest_id = _guest_id(request)
    items = payload.items
    item_keys = [(item.product_id, item.variant_id) for item in items]
    if len(item_keys) != len(set(item_keys)):
        raise HTTPException(status_code=422, detail="A cart item is duplicated.")
    try:
        quotes = await quote_order_items(
            db,
            [
                OrderItemInput(
                    product_id=item.product_id,
                    variant_id=item.variant_id,
                    qty=item.qty,
                )
                for item in items
            ],
        ) if items else []
    except CatalogValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    await db.execute(
        delete(guest_cart_items_table).where(guest_cart_items_table.c.guest_id == guest_id)
    )
    if items:
        await db.execute(
            insert(guest_cart_items_table),
            [
                {
                    "guest_id": guest_id,
                    "product_id": item.product_id,
                    "variant_key": item.variant_id or _NO_VARIANT,
                    "variant_id": item.variant_id,
                    "is_combo": bool(quote.catalog_component_requirements),
                    "qty": item.qty,
                    "position": position,
                }
                for position, (item, quote) in enumerate(zip(items, quotes))
            ],
        )
    await db.commit()
    return await _read_cart(db, guest_id)


async def _resolve_watchlist_slugs(db: AsyncSession, slugs: list[str]) -> list[UUID]:
    unique_slugs = list(dict.fromkeys(slugs))
    if not unique_slugs:
        return []
    regular_result = await db.execute(
        select(products_table.c.id, products_table.c.slug).where(
            products_table.c.slug.in_(unique_slugs)
        )
    )
    combo_result = await db.execute(
        select(combos_table.c.id, combos_table.c.slug).where(
            combos_table.c.slug.in_(unique_slugs)
        )
    )
    product_ids_by_slug = {
        row["slug"]: row["id"]
        for row in [*regular_result.mappings().all(), *combo_result.mappings().all()]
    }
    return list(dict.fromkeys(
        product_ids_by_slug[slug]
        for slug in unique_slugs
        if slug in product_ids_by_slug
    ))


@router.get("/api/watchlist")
async def get_watchlist(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> list[str]:
    saved = await db.execute(
        select(guest_watchlist_items_table.c.product_id)
        .where(
            guest_watchlist_items_table.c.guest_id == _guest_id(request)
        )
        .order_by(guest_watchlist_items_table.c.position)
    )
    ids = [row[0] for row in saved]
    if not ids:
        return []
    regular_result = await db.execute(
        select(products_table.c.id, products_table.c.slug).where(products_table.c.id.in_(ids))
    )
    combo_result = await db.execute(
        select(combos_table.c.id, combos_table.c.slug).where(combos_table.c.id.in_(ids))
    )
    slugs_by_id = {
        row["id"]: row["slug"]
        for row in [*regular_result.mappings().all(), *combo_result.mappings().all()]
    }
    return [slugs_by_id[product_id] for product_id in ids if product_id in slugs_by_id]


@router.put("/api/watchlist")
async def sync_watchlist(
    payload: WatchlistSyncRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> list[str]:
    unique_slugs = list(dict.fromkeys(payload.slugs))
    product_ids = await _resolve_watchlist_slugs(db, unique_slugs)
    await db.execute(
        delete(guest_watchlist_items_table).where(
            guest_watchlist_items_table.c.guest_id == _guest_id(request)
        )
    )
    if product_ids:
        await db.execute(
            insert(guest_watchlist_items_table),
            [
                {
                    "guest_id": _guest_id(request),
                    "product_id": product_id,
                    "position": position,
                }
                for position, product_id in enumerate(product_ids)
            ],
        )
    await db.commit()
    return await get_watchlist(request, db)
