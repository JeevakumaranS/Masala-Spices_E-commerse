import logging
import re
import uuid
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.storage import upload_file

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/uploads",
    tags=["uploads"]
)


@router.post("/image")
async def upload_image(product_id: UUID, file: UploadFile = File(...)):

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Only image files are allowed"
        )

    extension = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "img"
    if not re.fullmatch(r"[a-z0-9]{1,10}", extension):
        extension = "img"

    filename = f"{uuid.uuid4().hex}.{extension}"

    object_name = f"products/{product_id}/{filename}"

    try:
        upload_file(
            file.file,
            object_name,
            file.content_type
        )
    except Exception as exc:
        logger.exception("Product image upload to RustFS failed.")
        raise HTTPException(
            status_code=502,
            detail="Image storage upload failed. Check the RustFS endpoint, credentials, and bucket configuration.",
        ) from exc

    return {
        "filename": filename,
        "object_key": object_name
    }