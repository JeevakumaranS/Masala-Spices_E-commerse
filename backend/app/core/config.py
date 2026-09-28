"""Backend application configuration."""

import os

APP_TITLE = "Masala & Spices API"
APP_VERSION = "0.1.0"
DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
)


def get_cors_origins() -> list[str]:
    """Read comma-separated CORS origins, falling back to local development."""
    configured_origins = os.getenv("CORS_ORIGINS")
    if not configured_origins:
        return list(DEFAULT_CORS_ORIGINS)
    return [origin.strip() for origin in configured_origins.split(",") if origin.strip()]
