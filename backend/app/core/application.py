"""FastAPI application factory."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import APP_TITLE, APP_VERSION, get_cors_origins


def create_app() -> FastAPI:
    """Create and configure the backend application."""
    application = FastAPI(title=APP_TITLE, version=APP_VERSION)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_credentials=True,
        allow_methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    application.include_router(api_router)
    return application
