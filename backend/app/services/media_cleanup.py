"""Cleanup of RustFS images after their database references are removed."""

import asyncio
import logging
from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import (
    blog_posts_table,
    categories_table,
    combos_table,
    hero_images_table,
    homepage_settings_table,
    products_table,
    recipes_table,
)
from app.services.storage import delete_object, get_object_key

logger = logging.getLogger(__name__)


async def delete_unreferenced_objects(
    db: AsyncSession,
    object_keys: Iterable[str],
    *,
    context: str,
) -> None:
    candidates = {key for key in object_keys if key}
    if not candidates:
        return

    referenced: set[str] = set()
    reference_columns = (
        products_table.c.images,
        combos_table.c.images,
        categories_table.c.image_key,
        hero_images_table.c.object_key,
        recipes_table.c.hero_image_url,
        blog_posts_table.c.hero_image_url,
        homepage_settings_table.c.content,
    )

    for column in reference_columns:
        result = await db.execute(select(column))
        for value in result.scalars().all():
            if column is homepage_settings_table.c.content:
                if not isinstance(value, dict):
                    continue
                categories = value.get("categories")
                if not isinstance(categories, dict):
                    continue
                items = categories.get("items")
                if not isinstance(items, list):
                    continue
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    image_key = get_object_key(item.get("image_key"))
                    if image_key:
                        referenced.add(image_key)
            elif isinstance(value, list):
                referenced.update(
                    key
                    for image_reference in value
                    if (key := get_object_key(image_reference)) is not None
                )
            elif (key := get_object_key(value)) is not None:
                referenced.add(key)

    for object_key in candidates - referenced:
        try:
            await asyncio.to_thread(delete_object, object_key)
        except Exception:
            logger.exception(
                "Failed to delete an unreferenced RustFS image.",
                extra={"object_key": object_key, "context": context},
            )
