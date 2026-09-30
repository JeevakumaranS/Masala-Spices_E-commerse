"""Load the sample storefront catalog into PostgreSQL."""

import asyncio
import sys
from datetime import date
from pathlib import Path

from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import (
    engine,
    categories_table,
    products_table,
    recipes_table,
    session_factory,
    variants_table,
)
from app.modules.categories.data import sample_categories
from app.modules.products.data import sample_products
from app.modules.recipes.data import sample_recipes


async def seed() -> None:
    async with session_factory() as session:
        await session.execute(delete(variants_table))
        await session.execute(delete(products_table))
        await session.execute(delete(categories_table))
        await session.execute(delete(recipes_table))

        await session.execute(insert(categories_table).values(sample_categories))

        products = []
        variants = []
        for product in sample_products:
            products.append(
                {
                    key: product[key]
                    for key in (
                        "name",
                        "slug",
                        "description",
                        "ingredients",
                        "price",
                        "mrp",
                        "discount_pct",
                        "spice_level",
                        "status",
                        "categories",
                        "images",
                        "dish_type",
                        "is_veg",
                    )
                }
            )
            for variant in product["variants"]:
                item = {
                    "pack_size": variant["pack_size"],
                    "price": variant["price"],
                    "mrp": variant["mrp"],
                    "stock_qty": variant["stock_qty"],
                    "sku": variant["sku"],
                }
                if variant.get("expiry_date"):
                    item["expiry_date"] = date.fromisoformat(variant["expiry_date"])
                variants.append((product["slug"], item))

        # Insert products and capture their UUIDs
        result = await session.execute(
            insert(products_table).returning(products_table.c.id, products_table.c.slug)
        )
        slug_to_id = {row.slug: row.id for row in result}

        # Insert variants with correct product UUIDs
        for slug, variant_data in variants:
            variant_data["product_id"] = slug_to_id[slug]
            await session.execute(insert(variants_table).values(**variant_data))

        await session.execute(insert(recipes_table).values(sample_recipes))
        await session.commit()

    await engine.dispose()
    print("Catalog seeded into PostgreSQL.")


if __name__ == "__main__":
    asyncio.run(seed())
