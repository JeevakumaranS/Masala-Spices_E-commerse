"""Backend application configuration."""

import os
from pathlib import Path

from dotenv import load_dotenv

_repository_root = Path(__file__).resolve().parents[3]
load_dotenv(_repository_root / ".env", override=False)
load_dotenv(_repository_root / "backend" / ".env", override=False)

APP_TITLE = "Masala & Spices API"
APP_VERSION = "0.1.0"


def get_cors_origins() -> list[str]:
    """Read comma-separated allowed frontend origins from the environment."""
    configured_origins = os.getenv("CORS_ORIGINS", "")
    origins = [origin.strip() for origin in configured_origins.split(",") if origin.strip()]
    if not origins:
        raise RuntimeError("CORS_ORIGINS must contain at least one frontend origin.")
    return origins


def get_cors_origin_regex() -> str | None:
    """Read an optional CORS origin pattern from the environment."""
    return os.getenv("CORS_ORIGIN_REGEX") or None
