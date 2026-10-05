"""Validation and stock checks for discounted combo bundles."""

import asyncio
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.dialects import postgresql

from app.core.database import (
    combo_catalog_products_table,
    combos_table,
    metadata,
    products_table,
    variants_table,
)
from app.modules.admin.router import OrderLineAdjustment, ProductInput, _rebuild_order_items
from app.modules.orders.catalog import CatalogValidationError, quote_order_items
from app.modules.orders.catalog import QuotedOrderItem
from app.modules.orders.router import _deduct_order_inventory
from app.modules.orders.schemas import OrderItemInput


def test_admin_order_rebuild_rejects_new_products() -> None:
    product_id = uuid4()

    with pytest.raises(HTTPException, match="cannot be added to existing orders") as error:
        asyncio.run(_rebuild_order_items(
            object(),
            {"items": []},
            [OrderLineAdjustment(product_id=product_id, variant_id=None, qty=1)],
        ))

    assert error.value.status_code == 422


def _combo_payload(
    *,
    combo_catalog_products: list[dict[str, object]] | None = None,
    price: str = "80",
) -> dict[str, object]:
    return {
        "is_combo": True,
        "name": "Weeknight combo",
        "slug": "weeknight-combo",
        "price": price,
        "mrp": "100",
        "categories": ["combos-packs"],
        "combo_catalog_products": combo_catalog_products or [],
    }


def test_combo_requires_at_least_one_product_type() -> None:
    with pytest.raises(ValidationError, match="at least one product"):
        ProductInput.model_validate(_combo_payload())


def test_combo_requires_discount_below_combined_mrp() -> None:
    with pytest.raises(ValidationError, match="lower than the combined regular price"):
        ProductInput.model_validate(_combo_payload(
            combo_catalog_products=[{
                "product_id": str(uuid4()),
                "variant_id": str(uuid4()),
                "quantity": 2,
            }],
            price="100",
        ))


def test_combo_storage_is_separate_from_products_and_bundle_json() -> None:
    assert combos_table.name == "combos"
    assert "combo_products" not in metadata.tables
    assert "bundle_items" not in products_table.c
    assert {"combo_id", "product_id", "variant_id", "quantity"} <= set(
        combo_catalog_products_table.c.keys()
    )

def test_combo_input_accepts_regular_catalog_products() -> None:
    product_id = uuid4()
    variant_id = uuid4()
    combo = ProductInput.model_validate(_combo_payload(
        combo_catalog_products=[{
            "product_id": str(product_id),
            "variant_id": str(variant_id),
            "quantity": 2,
        }],
    ))

    assert combo.combo_catalog_products[0].variant_id == variant_id


class _Result:
    def __init__(self, rows: list[dict[str, object]]) -> None:
        self.rows = rows

    def mappings(self) -> "_Result":
        return self

    def __iter__(self):
        return iter(self.rows)


class _FakeDatabase:
    def __init__(self, results: list[list[dict[str, object]]]) -> None:
        self.results = iter(results)

    async def execute(self, *_args: object, **_kwargs: object) -> _Result:
        return _Result(next(self.results))


def test_combo_quote_checks_regular_catalog_component_stock() -> None:
    combo_id = uuid4()
    product_id = uuid4()
    variant_id = uuid4()
    combo = {
        "id": combo_id,
        "name": "Catalog combo",
        "price": Decimal("80"),
        "status": "active",
        "categories": ["combos-packs"],
        "is_combo": True,
    }
    component = {
        "id": uuid4(),
        "combo_id": combo_id,
        "product_id": product_id,
        "variant_id": variant_id,
        "quantity": 2,
        "sort_order": 0,
    }
    variant = {
        "id": variant_id,
        "product_id": product_id,
        "pack_size": "100 g",
        "sku": "CAT-100",
        "price": Decimal("30"),
        "mrp": Decimal("50"),
        "stock_qty": 4,
    }
    db = _FakeDatabase([[], [combo], [component], [variant]])

    quoted = asyncio.run(quote_order_items(db, [OrderItemInput(product_id=combo_id, qty=2)]))

    assert quoted[0].catalog_component_requirements == ((variant_id, 2),)


def test_combo_quote_rejects_insufficient_regular_catalog_component_stock() -> None:
    combo_id = uuid4()
    product_id = uuid4()
    variant_id = uuid4()
    combo = {
        "id": combo_id,
        "name": "Catalog combo",
        "price": Decimal("80"),
        "status": "active",
        "categories": ["combos-packs"],
        "is_combo": True,
    }
    component = {
        "id": uuid4(),
        "combo_id": combo_id,
        "product_id": product_id,
        "variant_id": variant_id,
        "quantity": 2,
        "sort_order": 0,
    }
    variant = {
        "id": variant_id,
        "product_id": product_id,
        "pack_size": "100 g",
        "sku": "CAT-100",
        "price": Decimal("30"),
        "mrp": Decimal("50"),
        "stock_qty": 3,
    }
    db = _FakeDatabase([[], [combo], [component], [variant]])

    with pytest.raises(CatalogValidationError, match="Only 3 unit"):
        asyncio.run(quote_order_items(db, [OrderItemInput(product_id=combo_id, qty=2)]))

class _InventoryResult:
    def __init__(self, updated_id: object | None) -> None:
        self.updated_id = updated_id

    def scalar_one_or_none(self) -> object | None:
        return self.updated_id


class _InventoryDatabase:
    def __init__(self, *, succeeds: bool = True) -> None:
        self.succeeds = succeeds
        self.statements = []
        self.rolled_back = False

    async def execute(self, statement: object) -> _InventoryResult:
        self.statements.append(statement)
        return _InventoryResult(uuid4() if self.succeeds else None)

    async def rollback(self) -> None:
        self.rolled_back = True


def _quoted_combo(variant_id: UUID, *, qty: int) -> QuotedOrderItem:
    return QuotedOrderItem(
        product_id=uuid4(),
        variant_id=None,
        name="Weeknight combo",
        pack_size="Standard",
        dish_type=None,
        categories=("combos-packs",),
        sku="PRODUCT-COMBO",
        unit_price=Decimal("80"),
        qty=qty,
        catalog_component_requirements=((variant_id, 2),),
    )


def test_combo_order_deducts_regular_catalog_component_stock() -> None:
    variant_id = uuid4()
    db = _InventoryDatabase()
    item = _quoted_combo(uuid4(), qty=2)
    item = QuotedOrderItem(
        product_id=item.product_id,
        variant_id=item.variant_id,
        name=item.name,
        pack_size=item.pack_size,
        dish_type=item.dish_type,
        categories=item.categories,
        sku=item.sku,
        unit_price=item.unit_price,
        qty=item.qty,
        catalog_component_requirements=((variant_id, 3),),
    )

    asyncio.run(_deduct_order_inventory(db, [item]))

    assert len(db.statements) == 1
    assert variants_table.name in str(db.statements[0])


def test_combo_order_deducts_aggregated_catalog_component_quantities_atomically() -> None:
    variant_id = uuid4()
    db = _InventoryDatabase()

    asyncio.run(_deduct_order_inventory(db, [
        _quoted_combo(combo_product_id, qty=2),
        _quoted_combo(combo_product_id, qty=1),
    ]))

    assert len(db.statements) == 1
    parameters = db.statements[0].compile(dialect=postgresql.dialect()).params
    assert 6 in parameters.values()
    assert db.rolled_back is False


def test_combo_order_rolls_back_when_atomic_stock_update_fails() -> None:
    db = _InventoryDatabase(succeeds=False)

    with pytest.raises(HTTPException, match="Stock changed while placing your order") as error:
        asyncio.run(_deduct_order_inventory(db, [_quoted_combo(uuid4(), qty=1)]))

    assert error.value.status_code == 422
    assert db.rolled_back is True
