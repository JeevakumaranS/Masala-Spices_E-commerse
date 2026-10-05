"""Load the sample storefront catalog into PostgreSQL."""

import asyncio
import sys
from datetime import date
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import (
    engine,
    categories_table,
    blog_posts_table,
    products_table,
    recipes_table,
    session_factory,
    variants_table,
)
from app.modules.categories.data import sample_categories
from app.modules.blog.data import sample_blog_posts
from app.modules.products.data import sample_products
from app.modules.recipes.data import sample_recipes


async def seed() -> None:
    try:
        async with session_factory() as session:
            catalog_exists = False
            for table in (
                categories_table,
                products_table,
                variants_table,
                recipes_table,
            ):
                count = await session.scalar(select(func.count()).select_from(table))
                if count:
                    print("Sample catalog seed skipped; catalog data already exists.")
                    catalog_exists = True
                    break

            if not catalog_exists:
                await session.execute(insert(categories_table).values(sample_categories))

                products = []
                variants = []
                for product in sample_products:
                    products.append(
                        {
                            key: product.get(key)
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

                result = await session.execute(
                    insert(products_table)
                    .values(products)
                    .returning(products_table.c.id, products_table.c.slug)
                )
                slug_to_id = {row.slug: row.id for row in result}

                for slug, variant_data in variants:
                    variant_data["product_id"] = slug_to_id[slug]
                    await session.execute(insert(variants_table).values(**variant_data))

                await session.execute(insert(recipes_table).values(sample_recipes))

            blog_posts = [
                {
                    **post,
                    "published_at": date.fromisoformat(post["published_at"]),
                    "status": "published",
                }
                for post in sample_blog_posts
            ]
            await session.execute(
                insert(blog_posts_table)
                .values(blog_posts)
                .on_conflict_do_nothing(index_elements=[blog_posts_table.c.slug])
            )
            await session.commit()
    finally:
        await engine.dispose()

    print("Sample data seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
