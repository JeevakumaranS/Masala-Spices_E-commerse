import asyncio
import logging
import re
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.services.storage import (
    build_image_filename,
    build_unique_object_key,
    upload_file,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/uploads",
    tags=["uploads"]
)


@router.post("/image")
async def upload_image(
    product_id: UUID,
    file: UploadFile = File(...),
    section: str = Query(default="products"),
    name: str | None = Query(default=None),
):

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Only image files are allowed"
        )

    section_name = section.strip().lower() or "products"
    if section_name not in {"products", "combos", "hero", "homepage", "blog", "recipes"}:
        section_name = "products"

    extension = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "img"
    if not re.fullmatch(r"[a-z0-9]{1,10}", extension):
        extension = "img"

    source_name = (name or str(product_id)).strip() or str(product_id)
    filename = build_image_filename(source_name, extension)
    try:
        object_name = await asyncio.to_thread(
            build_unique_object_key,
            section_name,
            filename,
        )
        upload_file(
            file.file,
            object_name,
            file.content_type,
        )
    except Exception as exc:
        logger.exception("Image upload to RustFS failed.")
        raise HTTPException(
            status_code=502,
            detail="Image storage upload failed. Check the RustFS endpoint, credentials, and bucket configuration.",
        ) from exc

    return {
        "filename": object_name.rsplit("/", 1)[-1],
        "object_key": object_name,
    }