import logging
import os
from urllib.parse import unquote, urlsplit

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv(".env")

s3 = boto3.client(
    "s3",
    endpoint_url=os.getenv("RUSTFS_ENDPOINT"),
    aws_access_key_id=os.getenv("RUSTFS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("RUSTFS_SECRET_KEY"),
    region_name="us-east-1"
)

BUCKET_NAME = os.getenv("RUSTFS_BUCKET")
RUSTFS_ENDPOINT = os.getenv("RUSTFS_ENDPOINT")
logger = logging.getLogger(__name__)


def get_object_key(image_reference: str) -> str | None:
    if image_reference.startswith("products/"):
        return image_reference
    if not BUCKET_NAME or not RUSTFS_ENDPOINT:
        return None

    image_url = urlsplit(image_reference)
    storage_endpoint = urlsplit(RUSTFS_ENDPOINT)
    if (
        image_url.scheme != storage_endpoint.scheme
        or image_url.hostname != storage_endpoint.hostname
        or image_url.port != storage_endpoint.port
    ):
        return None

    bucket_prefix = f"/{BUCKET_NAME}/"
    if not image_url.path.startswith(bucket_prefix):
        return None

    object_key = unquote(image_url.path[len(bucket_prefix):])
    return object_key if object_key.startswith("products/") else None


def object_exists(object_key: str) -> bool:
    try:
        s3.head_object(Bucket=BUCKET_NAME, Key=object_key)
    except ClientError as error:
        error_code = error.response.get("Error", {}).get("Code")
        status_code = error.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
        if error_code in {"404", "NoSuchKey", "NotFound"} or status_code == 404:
            return False
        raise
    return True


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
    try:
        s3.delete_object(Bucket=BUCKET_NAME, Key=object_key)
    except ClientError as error:
        error_code = error.response.get("Error", {}).get("Code")
        status_code = error.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
        if error_code in {"404", "NoSuchKey", "NotFound"} or status_code == 404:
            logger.info("RustFS object was already missing during cleanup.", extra={"object_key": object_key})
            return
        raise


def get_file_url(object_name: str, expires_in: int = 3600) -> str:
    return s3.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": BUCKET_NAME,
            "Key": object_name,
        },
        ExpiresIn=expires_in,
    )