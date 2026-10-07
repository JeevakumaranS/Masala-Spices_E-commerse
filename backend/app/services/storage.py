import logging
import os
import re
from uuid import uuid4
from urllib.parse import unquote, urlsplit

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv(".env")

RUSTFS_ENDPOINT = os.getenv("RUSTFS_ENDPOINT")
RUSTFS_PUBLIC_ENDPOINT = os.getenv("RUSTFS_PUBLIC_ENDPOINT") or RUSTFS_ENDPOINT
BUCKET_NAME = os.getenv("RUSTFS_BUCKET")
LEGACY_BUCKET_NAME = os.getenv("RUSTFS_LEGACY_BUCKET")
LEGACY_STORAGE_ROOT = "masalafolder"
logger = logging.getLogger(__name__)

s3 = boto3.client(
    "s3",
    endpoint_url=RUSTFS_ENDPOINT,
    aws_access_key_id=os.getenv("RUSTFS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("RUSTFS_SECRET_KEY"),
    region_name="us-east-1",
)

public_s3 = boto3.client(
    "s3",
    endpoint_url=RUSTFS_PUBLIC_ENDPOINT,
    aws_access_key_id=os.getenv("RUSTFS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("RUSTFS_SECRET_KEY"),
    region_name="us-east-1",
)


def build_object_key(section: str, *parts: str) -> str:
    cleaned = []
    for part in (section, *parts):
        for chunk in str(part).split("/"):
            chunk = chunk.strip().strip(".")
            if chunk:
                cleaned.append(chunk)
    return "/".join(cleaned)


def build_image_filename(source_name: str | None, extension: str) -> str:
    source_leaf = re.split(r"[/\\]", source_name or "")[-1]
    source_stem = source_leaf.rsplit(".", 1)[0] if "." in source_leaf else source_leaf
    readable_name = re.sub(r"[^a-z0-9]+", "-", source_stem.lower()).strip("-")
    readable_name = readable_name[:100].strip("-")
    safe_extension = extension.lower().lstrip(".")
    if not re.fullmatch(r"[a-z0-9]{1,10}", safe_extension):
        safe_extension = "img"
    return f"{readable_name or 'image'}.{safe_extension}"


def build_unique_object_key(section: str, *parts: str) -> str:
    if not parts:
        raise ValueError("An image filename is required.")

    flattened = []
    for part in parts:
        for chunk in str(part).split("/"):
            chunk = chunk.strip().strip(".")
            if chunk:
                flattened.append(chunk)

    if not flattened:
        raise ValueError("An image filename is required.")

    base_name = "-".join(flattened)
    base_stem, extension = os.path.splitext(base_name)
    base_stem = re.sub(r"[^a-z0-9-]+", "-", base_stem.lower()).strip("-") or "image"
    extension = extension or ".img"
    if section in {"products", "combos", "collections"}:
        filename = f"{base_stem}-{uuid4().hex[:8]}{extension}"
        object_key = build_object_key(section, filename)
        if not object_exists(object_key):
            return object_key
        for _ in range(20):
            filename = f"{base_stem}-{uuid4().hex[:8]}{extension}"
            object_key = build_object_key(section, filename)
            if not object_exists(object_key):
                return object_key
        raise RuntimeError(f"Could not find an available object name for {section} images.")

    candidate_name = base_name
    stem, ext = os.path.splitext(candidate_name)
    suffix = 1
    while True:
        candidate_name = base_name if suffix == 1 else f"{stem}-{suffix}{ext}"
        object_key = build_object_key(section, candidate_name)
        if not object_exists(object_key):
            return object_key
        suffix += 1


def _configured_storage_endpoints():
    endpoints = []
    for raw_endpoint in {RUSTFS_ENDPOINT, RUSTFS_PUBLIC_ENDPOINT}:
        if raw_endpoint:
            parsed = urlsplit(raw_endpoint)
            if parsed.hostname:
                endpoints.append(parsed)
    return endpoints


def _is_missing_object_error(error: ClientError) -> bool:
    error_code = error.response.get("Error", {}).get("Code")
    status_code = error.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
    return error_code in {"404", "NoSuchBucket", "NoSuchKey", "NotFound"} or status_code == 404


def _object_bucket(object_key: str) -> str | None:
    buckets = list(dict.fromkeys(
        bucket for bucket in (BUCKET_NAME, LEGACY_BUCKET_NAME) if bucket
    ))
    for bucket in buckets:
        try:
            s3.head_object(Bucket=bucket, Key=object_key)
        except ClientError as error:
            if _is_missing_object_error(error):
                continue
            raise
        return bucket
    return None


def get_object_key(image_reference: str | None) -> str | None:
    if not isinstance(image_reference, str) or not image_reference:
        return None
    supported_prefixes = (
        "products/",
        "combos/",
        "about/",
        "hero/",
        "homepage/",
        "blog/",
        "recipes/",
        "collections/",
        f"{LEGACY_STORAGE_ROOT}/products/",
        f"{LEGACY_STORAGE_ROOT}/combos/",
        f"{LEGACY_STORAGE_ROOT}/about/",
        f"{LEGACY_STORAGE_ROOT}/hero/",
        f"{LEGACY_STORAGE_ROOT}/homepage/",
        f"{LEGACY_STORAGE_ROOT}/blog/",
        f"{LEGACY_STORAGE_ROOT}/recipes/",
        f"{LEGACY_STORAGE_ROOT}/collections/",
    )
    if image_reference.startswith(supported_prefixes):
        return image_reference
    buckets = tuple(dict.fromkeys(
        bucket for bucket in (BUCKET_NAME, LEGACY_BUCKET_NAME) if bucket
    ))
    if not buckets:
        return None

    image_url = urlsplit(image_reference)
    configured_endpoints = _configured_storage_endpoints()
    if configured_endpoints and not any(
        image_url.hostname == endpoint.hostname and image_url.port == endpoint.port
        for endpoint in configured_endpoints
    ):
        return None

    for bucket in buckets:
        bucket_prefix = f"/{bucket}/"
        if image_url.path.startswith(bucket_prefix):
            object_key = unquote(image_url.path[len(bucket_prefix):])
            if object_key.startswith(supported_prefixes):
                return object_key
    return None


def object_exists(object_key: str) -> bool:
    return _object_bucket(object_key) is not None


def test_rustfs():
    response = s3.list_buckets()

    for bucket in response["Buckets"]:
        print(bucket["Name"])


def upload_file(file, object_name: str, content_type: str): 
    s3.upload_fileobj(
        file,
        BUCKET_NAME,
        object_name,
        ExtraArgs={
            "ContentType": content_type,
            "CacheControl": "public, max-age=31536000, immutable",
        }
    )

    return object_name


def delete_object(object_key: str) -> None:
    bucket = _object_bucket(object_key)
    if bucket is None:
        logger.info("RustFS object was already missing during cleanup.", extra={"object_key": object_key})
        return
    try:
        s3.delete_object(Bucket=bucket, Key=object_key)
    except ClientError as error:
        if _is_missing_object_error(error):
            logger.info("RustFS object was already missing during cleanup.", extra={"object_key": object_key})
            return
        raise


def get_file_url(object_name: str, expires_in: int = 3600) -> str:
    bucket = _object_bucket(object_name) or BUCKET_NAME
    return public_s3.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": bucket,
            "Key": object_name,
        },
        ExpiresIn=expires_in,
    )