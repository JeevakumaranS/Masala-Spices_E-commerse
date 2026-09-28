"""Authoritative product and variant pricing for order calculations."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Iterable
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import products_table, variants_table
from app.modules.orders.schemas import OrderItemInput


class CatalogValidationError(ValueError):
    """Raised when a requested product, variant, or stock quantity is invalid."""


@dataclass(frozen=True)
class QuotedOrderItem:
    product_id: UUID
    variant_id: UUID | None
    name: str
    pack_size: str
    dish_type: str | None
    categories: tuple[str, ...]
    sku: str
    unit_price: Decimal
    qty: int


async def quote_order_items(
    db: AsyncSession,
    requested_items: Iterable[OrderItemInput],
) -> list[QuotedOrderItem]:
    items = list(requested_items)
    if not items:
        raise CatalogValidationError("Your bag is empty.")

    product_ids = sorted({item.product_id for item in items})
    product_result = await db.execute(
        select(products_table).where(products_table.c.id.in_(product_ids))
    )
    products = {row["id"]: dict(row) for row in product_result.mappings()}

    missing_products = sorted(set(product_ids) - set(products))
    if missing_products:
        raise CatalogValidationError("One or more products in your bag are no longer available.")

    variant_ids = sorted({item.variant_id for item in items if item.variant_id is not None})
    variants: dict[UUID, dict] = {}
    if variant_ids:
        variant_result = await db.execute(
            select(variants_table).where(variants_table.c.id.in_(variant_ids))
        )
        variants = {row["id"]: dict(row) for row in variant_result.mappings()}

    requested_by_variant: dict[UUID, int] = {}
    for item in items:
        if item.variant_id is not None:
            requested_by_variant[item.variant_id] = (
                requested_by_variant.get(item.variant_id, 0) + item.qty
            )

    for variant_id, quantity in requested_by_variant.items():
        variant = variants.get(variant_id)
        if variant is None:
            raise CatalogValidationError("A selected pack size is no longer available.")
        if variant["product_id"] not in product_ids:
            raise CatalogValidationError("A selected pack size does not match its product.")
        if int(variant["stock_qty"]) < quantity:
            raise CatalogValidationError(
                f"Only {int(variant['stock_qty'])} unit(s) remain for {variant['pack_size']}."
            )

    quotes: list[QuotedOrderItem] = []
    for item in items:
        product = products[item.product_id]
        if str(product.get("status") or "active").lower() != "active":
            raise CatalogValidationError(f"{product['name']} is not currently available.")

        variant = variants.get(item.variant_id) if item.variant_id is not None else None
        if item.variant_id is not None and variant is None:
            raise CatalogValidationError("A selected pack size is no longer available.")
        if variant is not None and variant["product_id"] != item.product_id:
            raise CatalogValidationError("A selected pack size does not match its product.")

        unit_price = Decimal(str(variant["price"] if variant else product["price"]))
        if unit_price < 0:
            raise CatalogValidationError("A product price could not be verified.")

        quotes.append(
            QuotedOrderItem(
                product_id=item.product_id,
                variant_id=item.variant_id,
                name=str(product["name"]),
                pack_size=str(variant["pack_size"] if variant else "Standard"),
                dish_type=product.get("dish_type"),
                categories=tuple(product.get("categories") or []),
                sku=str(variant["sku"] if variant is not None else f"PRODUCT-{product['id']}"),
                unit_price=unit_price,
                qty=item.qty,
            )
        )

    return quotes
