"""Regular product prices and pack details are owned by product variants."""

import asyncio
from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.core.database import products_table
from app.modules.admin.router import ComboInput, ProductInput, VariantInput, _dump_product
from app.modules.orders.catalog import CatalogValidationError, quote_order_items
from app.modules.orders.schemas import OrderItemInput


def _variant() -> VariantInput:
    return VariantInput(
        pack_size="100g",
        price=Decimal("125"),
        mrp=Decimal("150"),
        stock_qty=10,
        sku="TEST-100",
    )


def test_products_table_does_not_define_removed_product_attributes() -> None:
    removed = {
        "ingredients",
        "price",
        "mrp",
        "discount_pct",
        "dish_type",
        "is_veg",
        "net_weight_options",
    }

    assert removed.isdisjoint(products_table.c.keys())
    assert removed.isdisjoint(ProductInput.model_fields)


def test_regular_product_persistence_uses_variant_pricing_only() -> None:
    payload = ProductInput(
        name="Test masala",
        slug="test-masala",
        description="A sample product.",
        variants=[_variant()],
    )

    persisted = _dump_product(payload)

    assert persisted["name"] == "Test masala"
    assert {"price", "mrp", "discount_pct", "ingredients", "dish_type", "is_veg"}.isdisjoint(persisted)


def test_regular_product_input_rejects_removed_attributes() -> None:
    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        ProductInput(
            name="Test masala",
            slug="test-masala",
            price=Decimal("99"),
            variants=[_variant()],
        )


def test_regular_product_requires_at_least_one_pack_variant() -> None:
    with pytest.raises(ValidationError, match="at least one pack size"):
        ProductInput(name="Unpriced product", slug="unpriced-product")


def test_regular_product_requires_uploaded_image_keys() -> None:
    with pytest.raises(ValidationError, match="Upload product photos"):
        ProductInput(
            name="External photo product",
            slug="external-photo-product",
            variants=[_variant()],
            images=["https://images.example.test/photo.jpg"],
        )


def test_combo_pricing_and_metadata_remain_separate() -> None:
    payload = ComboInput(
        name="Test combo",
        slug="test-combo",
        price=Decimal("80"),
        mrp=Decimal("100"),
        dish_type="Combo",
        is_veg=False,
        combo_catalog_products=[{
            "product_id": uuid4(),
            "variant_id": uuid4(),
            "quantity": 1,
        }],
    )

    persisted = _dump_product(payload)

    assert persisted["price"] == Decimal("80")
    assert persisted["mrp"] == Decimal("100")
    assert persisted["dish_type"] == "Combo"
    assert persisted["is_veg"] is False


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


def test_regular_order_price_is_quoted_from_variant_not_product() -> None:
    product_id, variant_id = uuid4(), uuid4()
    product = {
        "id": product_id,
        "name": "Variant-priced masala",
        "status": "active",
        "categories": [],
    }
    variant = {
        "id": variant_id,
        "product_id": product_id,
        "pack_size": "100g",
        "sku": "VAR-100",
        "price": Decimal("125"),
        "stock_qty": 5,
    }
    db = _FakeDatabase([[product], [], [variant]])

    quoted = asyncio.run(quote_order_items(
        db,
        [OrderItemInput(product_id=product_id, variant_id=variant_id, qty=1)],
    ))

    assert quoted[0].unit_price == Decimal("125")


def test_regular_order_without_pack_variant_is_rejected() -> None:
    product_id = uuid4()
    db = _FakeDatabase([[
        {
            "id": product_id,
            "name": "Unpriced masala",
            "status": "active",
            "categories": [],
        },
    ], [], []])

    with pytest.raises(CatalogValidationError, match="Choose an available pack size"):
        asyncio.run(quote_order_items(
            db,
            [OrderItemInput(product_id=product_id, qty=1)],
        ))
