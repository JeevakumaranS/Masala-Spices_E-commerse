"""Public and protected homepage content endpoints."""

import asyncio
import io
import logging
import re
from datetime import datetime, timezone
from urllib.parse import urlsplit
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import insert, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import (
    get_db,
    hero_images_table,
    homepage_settings_table,
    products_table,
    recipes_table,
)
from app.modules.admin.auth import require_admin
from app.modules.homepage.schemas import DEFAULT_HOME_PAGE_CONTENT, HomePageContent
from app.services.storage import (
    delete_object,
    get_file_url,
    get_object_key,
    object_exists,
    upload_file,
)

router = APIRouter(tags=["homepage"])
logger = logging.getLogger(__name__)
_IMAGE_IMPORT_HOSTS = {
    "images.unsplash.com",
    "imgs.search.brave.com",
    "shop.cookdtv.com",
    "img.magnific.com",
    "tiimg.tistatic.com",
    "images.jdmagicbox.com",
    "assets.cookdtv.com",
}
_MAX_IMPORTED_IMAGE_BYTES = 12 * 1024 * 1024
_IMAGE_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
}


def _validate_import_url(image_url: str) -> str:
    try:
        parsed = urlsplit(image_url)
        port = parsed.port
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail="An image uses an invalid source URL. Replace it with an uploaded photo.",
        ) from exc
    if (
        parsed.scheme != "https"
        or parsed.hostname not in _IMAGE_IMPORT_HOSTS
        or port not in (None, 443)
        or parsed.username is not None
        or parsed.password is not None
    ):
        raise HTTPException(
            status_code=422,
            detail="An image uses a source that cannot be securely imported. Replace it with an uploaded photo.",
        )
    return image_url


def _download_image(image_url: str) -> tuple[bytes, str]:
    _validate_import_url(image_url)
    try:
        with httpx.Client(
            timeout=httpx.Timeout(20.0, connect=5.0),
            follow_redirects=False,
            trust_env=False,
        ) as client:
            with client.stream("GET", image_url) as response:
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=502,
                        detail="An existing homepage image could not be downloaded from its source.",
                    )
                content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
                if content_type not in _IMAGE_EXTENSIONS:
                    raise HTTPException(
                        status_code=422,
                        detail="A homepage image source returned an unsupported image format.",
                    )
                content_length = response.headers.get("content-length")
                if content_length and int(content_length) > _MAX_IMPORTED_IMAGE_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="A homepage image is too large to import into RustFS.",
                    )
                content = bytearray()
                for chunk in response.iter_bytes():
                    content.extend(chunk)
                    if len(content) > _MAX_IMPORTED_IMAGE_BYTES:
                        raise HTTPException(
                            status_code=413,
                            detail="A homepage image is too large to import into RustFS.",
                        )
                if not content:
                    raise HTTPException(
                        status_code=422,
                        detail="A homepage image source returned an empty file.",
                    )
    except HTTPException:
        raise
    except (httpx.HTTPError, ValueError) as exc:
        logger.exception("Failed to download a homepage image for RustFS import.")
        raise HTTPException(
            status_code=502,
            detail="A homepage image could not be downloaded. Check the source URL and try again.",
        ) from exc
    return bytes(content), content_type


def _import_image(image_url: str, prefix: str) -> str:
    content, content_type = _download_image(image_url)
    object_key = f"{prefix}/{uuid4().hex}.{_IMAGE_EXTENSIONS[content_type]}"
    upload_file(io.BytesIO(content), object_key, content_type)
    return object_key


async def _existing_object(object_key: str) -> bool:
    return await asyncio.to_thread(object_exists, object_key)


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
        if item["image_key"].startswith("homepage/")
    }
    urls = await asyncio.gather(
        *(asyncio.to_thread(get_file_url, object_key) for object_key in keys)
    )
    resolved_urls = dict(zip(keys, urls, strict=True))
    for item in content["categories"]["items"]:
        if item["image_key"]:
            item["image_url"] = resolved_urls.get(item["image_key"], "")
    return content


@router.get("/api/homepage-content", response_model=HomePageContent)
async def public_homepage_content(db: AsyncSession = Depends(get_db)) -> dict:
    return await _content_response(db)


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
        if item["image_key"]:
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
async def upload_homepage_media(file: UploadFile = File(...)) -> dict[str, str]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")
    extension = (
        file.filename.rsplit(".", 1)[-1].lower()
        if file.filename and "." in file.filename
        else "img"
    )
    if not re.fullmatch(r"[a-z0-9]{1,10}", extension):
        extension = "img"
    object_key = f"homepage/{uuid4().hex}/{uuid4().hex}.{extension}"
    try:
        await asyncio.to_thread(upload_file, file.file, object_key, file.content_type)
        image_url = await asyncio.to_thread(get_file_url, object_key)
    except Exception as exc:
        logger.exception("Homepage media upload failed.")
        raise HTTPException(
            status_code=502,
            detail="Homepage image storage upload failed. Check the storage configuration.",
        ) from exc
    return {"image_key": object_key, "image_url": image_url}


@router.post(
    "/api/admin/homepage-media/sync",
    dependencies=[Depends(require_admin)],
)
async def sync_homepage_images_to_rustfs(
    db: AsyncSession = Depends(get_db),
) -> dict:
    uploaded_keys: list[str] = []
    uploaded_by_source: dict[tuple[str, str], str] = {}
    uploaded_count = 0
    existing_count = 0

    async def retain_image(image_url: str, prefix: str) -> str:
        nonlocal uploaded_count, existing_count
        cache_key = (prefix, image_url)
        if cache_key in uploaded_by_source:
            existing_count += 1
            return uploaded_by_source[cache_key]
        _validate_import_url(image_url)
        object_key = await asyncio.to_thread(_import_image, image_url, prefix)
        uploaded_keys.append(object_key)
        uploaded_by_source[cache_key] = object_key
        uploaded_count += 1
        return object_key

    try:
        content = (await _load_content(db)).model_dump(mode="json")

        for row in (await db.execute(select(hero_images_table.c.object_key))).mappings():
            if not await _existing_object(row["object_key"]):
                raise HTTPException(
                    status_code=502,
                    detail="A hero image is missing from RustFS. Re-upload that hero photo and retry.",
                )
            existing_count += 1

        products = [
            dict(row)
            for row in (
                await db.execute(select(products_table.c.id, products_table.c.images))
            ).mappings()
        ]
        for product in products:
            product_images = product["images"] or []
            updated_images: list[str] = []
            for image_reference in product_images:
                object_key = get_object_key(image_reference)
                if object_key and await _existing_object(object_key):
                    updated_images.append(object_key)
                    existing_count += 1
                    continue
                updated_images.append(
                    await retain_image(
                        image_reference,
                        f"products/{product['id']}",
                    )
                )
            if updated_images != product_images:
                await db.execute(
                    update(products_table)
                    .where(products_table.c.id == product["id"])
                    .values(images=updated_images)
                )

        category_items = content["categories"]["items"]
        for item in category_items:
            object_key = item["image_key"]
            if object_key:
                if not object_key.startswith("homepage/") or not await _existing_object(object_key):
                    raise HTTPException(
                        status_code=502,
                        detail="A managed category photo is missing from RustFS. Upload that photo again and retry.",
                    )
                existing_count += 1
            elif item["image_url"]:
                item["image_key"] = await retain_image(
                    item["image_url"],
                    "homepage/categories",
                )
                item["image_url"] = ""

        recipes = [
            dict(row)
            for row in (
                await db.execute(
                    select(
                        recipes_table.c.slug,
                        recipes_table.c.hero_image_url,
                    )
                )
            ).mappings()
        ]
        for recipe in recipes:
            image_reference = recipe["hero_image_url"]
            if image_reference.startswith("homepage/"):
                if not await _existing_object(image_reference):
                    raise HTTPException(
                        status_code=502,
                        detail="A recipe photo is missing from RustFS. Upload that photo again and retry.",
                    )
                existing_count += 1
            else:
                image_key = await retain_image(image_reference, "homepage/recipes")
                await db.execute(
                    update(recipes_table)
                    .where(recipes_table.c.slug == recipe["slug"])
                    .values(hero_image_url=image_key)
                )

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
        if result.rowcount == 0:
            await db.execute(
                insert(homepage_settings_table).values(
                    content=content,
                    updated_at=now,
                )
            )
        await db.commit()
    except Exception:
        await db.rollback()
        for object_key in uploaded_keys:
            try:
                await asyncio.to_thread(delete_object, object_key)
            except Exception:
                logger.exception(
                    "Failed to clean up an unreferenced homepage image after sync failure.",
                    extra={"object_key": object_key},
                )
        raise

    return {
        "content": await _content_response(db),
        "uploaded_count": uploaded_count,
        "already_in_rustfs_count": existing_count,
        "product_count": len(products),
    }
