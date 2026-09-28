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
                        "id",
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
                        "contains_ginger_garlic",
                        "contains_tamarind",
                    )
                }
            )
            for variant in product["variants"]:
                item = dict(variant)
                item["product_id"] = product["id"]
                if item.get("expiry_date"):
                    item["expiry_date"] = date.fromisoformat(item["expiry_date"])
                variants.append(item)

        await session.execute(insert(products_table).values(products))
        await session.execute(insert(variants_table).values(variants))
        await session.execute(insert(recipes_table).values(sample_recipes))
        await session.commit()

    await engine.dispose()
    print("Catalog seeded into PostgreSQL.")


if __name__ == "__main__":
    asyncio.run(seed())
