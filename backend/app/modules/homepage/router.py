"""Public and protected homepage content endpoints."""

import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import insert, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import (
    get_db,
    homepage_settings_table,
)
from app.modules.admin.auth import require_admin
from app.modules.homepage.schemas import DEFAULT_HOME_PAGE_CONTENT, HomePageContent
from app.services.storage import (
    build_image_filename,
    build_unique_object_key,
    get_file_url,
    upload_file,
)

router = APIRouter(tags=["homepage"])
logger = logging.getLogger(__name__)
ABOUT_IMAGE_KEY = "about/masala-house-story.jpeg"


async def _load_content(db: AsyncSession) -> HomePageContent:
    result = await db.execute(
        select(homepage_settings_table.c.content)
        .order_by(homepage_settings_table.c.id)
        .limit(1)
    )
    stored = result.scalar_one_or_none()
    if stored is None:
        return DEFAULT_HOME_PAGE_CONTENT.model_copy(deep=True)
    stored = dict(stored)
    combo_content = dict(stored.get("combos") or {})
    combo_slugs = combo_content.get("product_slugs", [])
    offer_codes = combo_content.get("offer_codes", [])
    combo_content["product_slugs"] = list(dict.fromkeys(
        slug for slug in combo_slugs if isinstance(slug, str)
    ))[:4] if isinstance(combo_slugs, list) else []
    remaining_slots = 4 - len(combo_content["product_slugs"])
    combo_content["offer_codes"] = list(dict.fromkeys(
        code for code in offer_codes if isinstance(code, str)
    ))[:remaining_slots] if isinstance(offer_codes, list) else []
    stored["combos"] = combo_content
    recipe_content = dict(stored.get("recipes") or {})
    selected_slugs = recipe_content.get("recipe_slugs", [])
    if isinstance(selected_slugs, list):
        recipe_content["recipe_slugs"] = list(dict.fromkeys(
            slug for slug in selected_slugs if isinstance(slug, str)
        ))[:4]
    else:
        recipe_content["recipe_slugs"] = []
    stored["recipes"] = recipe_content
    return HomePageContent.model_validate(stored)


async def _content_response(db: AsyncSession) -> dict:
    content = (await _load_content(db)).model_dump(mode="json")
    keys = {
        item["image_key"]
        for item in content["categories"]["items"]
        if item["image_key"].startswith(("homepage/", "masalafolder/homepage/"))
    }
    urls = await asyncio.gather(
        *(asyncio.to_thread(get_file_url, object_key) for object_key in keys)
    )
    resolved_urls = dict(zip(keys, urls, strict=True))
    for item in content["categories"]["items"]:
        item["image_url"] = resolved_urls.get(item["image_key"], "")
    return content


@router.get("/api/homepage-content", response_model=HomePageContent)
async def public_homepage_content(db: AsyncSession = Depends(get_db)) -> dict:
    return await _content_response(db)


@router.get("/api/about-image")
async def public_about_image() -> dict[str, str]:
    try:
        image_url = await asyncio.to_thread(get_file_url, ABOUT_IMAGE_KEY)
    except Exception as exc:
        logger.exception("About page image URL could not be generated.")
        raise HTTPException(
            status_code=502,
            detail="About page image is unavailable from RustFS.",
        ) from exc
    return {"image_url": image_url}


@router.get(
    "/api/admin/homepage-content",
    response_model=HomePageContent,
    dependencies=[Depends(require_admin)],
)
async def admin_homepage_content(db: AsyncSession = Depends(get_db)) -> dict:
    return await _content_response(db)


@router.put(
    "/api/admin/homepage-content",
    response_model=HomePageContent,
    dependencies=[Depends(require_admin)],
)
async def save_homepage_content(
    payload: HomePageContent,
    db: AsyncSession = Depends(get_db),
) -> dict:
    content = payload.model_dump(mode="json")
    for item in content["categories"]["items"]:
        if item["image_url"]:
            raise HTTPException(
                status_code=422,
                detail="Upload category photos to RustFS instead of providing photo URLs.",
            )
        item["image_url"] = ""
    now = datetime.now(timezone.utc)
    settings_id = (
        select(homepage_settings_table.c.id)
        .order_by(homepage_settings_table.c.id)
        .limit(1)
        .scalar_subquery()
    )
    result = await db.execute(
        update(homepage_settings_table)
        .where(homepage_settings_table.c.id == settings_id)
        .values(content=content, updated_at=now)
    )
    try:
        if result.rowcount == 0:
            await db.execute(
                insert(homepage_settings_table).values(content=content, updated_at=now)
            )
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        logger.warning("Concurrent homepage settings creation detected.")
        raise HTTPException(
            status_code=409,
            detail="Homepage content changed concurrently. Reload the editor and save again.",
        ) from exc
    except Exception:
        await db.rollback()
        logger.exception("Failed to persist homepage settings.")
        raise
    return await _content_response(db)


@router.post(
    "/api/admin/homepage-media",
    dependencies=[Depends(require_admin)],
)
async def upload_homepage_media(
    file: UploadFile = File(...),
    section: Literal["homepage/categories", "blog", "recipes", "collections", "about"] = "homepage/categories",
    name: str | None = Query(default=None, max_length=255),
) -> dict[str, str]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")
    extension = (
        file.filename.rsplit(".", 1)[-1].lower()
        if file.filename and "." in file.filename
        else "img"
    )
    if not re.fullmatch(r"[a-z0-9]{1,10}", extension):
        extension = "img"
    filename = build_image_filename(name or file.filename, extension)
    try:
        object_key = await asyncio.to_thread(build_unique_object_key, section, filename)
        await asyncio.to_thread(upload_file, file.file, object_key, file.content_type)
        image_url = await asyncio.to_thread(get_file_url, object_key)
    except Exception as exc:
        logger.exception("Homepage media upload failed.")
        raise HTTPException(
            status_code=502,
            detail="Homepage image storage upload failed. Check the storage configuration.",
        ) from exc
    return {"image_key": object_key, "image_url": image_url}
