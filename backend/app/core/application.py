"""FastAPI application factory."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import uploads
from app.api.router import api_router
from app.core.config import (
    APP_TITLE,
    APP_VERSION,
    get_cors_origin_regex,
    get_cors_origins,
)
from app.core.guest_middleware import GuestIdentityMiddleware


def create_app() -> FastAPI:
    """Create and configure the backend application."""

    application = FastAPI(
        title=APP_TITLE,
        version=APP_VERSION
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_origin_regex=get_cors_origin_regex(),
        allow_credentials=True,
        allow_methods=[
            "GET",
            "HEAD",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        ],
        allow_headers=["*"],
    )
    application.add_middleware(GuestIdentityMiddleware)

    application.include_router(api_router)
    application.include_router(uploads.router)

    return application