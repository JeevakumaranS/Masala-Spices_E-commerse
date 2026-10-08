"""Admin authentication and protected catalog/order/campaign/review operations."""

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable
from datetime import date, datetime, timezone
from decimal import Decimal
from ipaddress import ip_address
import re
from typing import Any, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile
from fastapi.security import HTTPAuthorizationCredentials
from httpx import InvalidURL, URL
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import delete, func, insert, select, text, update
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import (
    admin_users_table,
    categories_table,
    combos_table,
    coupons_table,
    get_db,
    hero_images_table,
    homepage_settings_table,
    notification_settings_table,
    order_history_table,
    order_items_table,
    orders_table,
    products_table,
    reviews_table,
    recipes_table,
    session_factory,
    variants_table,
)
from app.modules.admin.auth import bearer, hash_password, issue_token, require_admin, verify_password
from app.modules.admin.schemas import AdminOverviewResponse, LoginRequest, RegisterAdminRequest
from app.modules.analytics.router import analytics_summary
from app.modules.categories.router import category_response
from app.modules.notifications.email import send_order_status_email
from app.modules.notifications.settings import get_notification_settings
from app.modules.orders.shipping import calculate_shipping
from app.modules.products.router import hydrate_products
from app.modules.recipes.router import _recipe_response
from app.modules.recipes.schemas import RecipeInput
from app.services.media_cleanup import delete_unreferenced_objects
from app.services.storage import (
    build_image_filename,
    build_unique_object_key,
    delete_object,
    get_file_url,
    get_object_key,
    upload_file,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])
logger = logging.getLogger(__name__)
hero_images_router = APIRouter(tags=["hero images"])
_OVERVIEW_CACHE_SECONDS = 60
_OVERVIEW_WIDGET_TIMEOUT_SECONDS = 5
MAX_HERO_IMAGES = 6
_overview_cache: dict[str, tuple[float, AdminOverviewResponse]] = {}


async def _all_admin_orders(db: AsyncSession) -> list[dict[str, Any]]:
    orders: list[dict[str, Any]] = []
    offset = 0
    page_size = 500
    while True:
        page = await admin_orders(limit=page_size, offset=offset, db=db)
        orders.extend(page)
        if len(page) < page_size:
            return orders
        offset += page_size


async def _overview_reviews(db: AsyncSession) -> list[dict[str, Any]]:
    return await admin_reviews(db=db)


async def _load_overview_widget(
    name: str,
    loader: Callable[[AsyncSession], Awaitable[Any]],
) -> tuple[str, Any | None, str | None]:
    try:
        async with session_factory() as db:
            value = await asyncio.wait_for(
                loader(db),
                timeout=_OVERVIEW_WIDGET_TIMEOUT_SECONDS,
            )
        return name, value, None
    except asyncio.TimeoutError:
        logger.warning("Admin overview widget timed out.", extra={"widget": name})
        return name, None, "Timed out while loading this widget."
    except Exception:
        logger.exception("Admin overview widget failed.", extra={"widget": name})
        return name, None, "Unable to load this widget."


@router.get("/overview", response_model=AdminOverviewResponse)
async def admin_overview(
    force_refresh: bool = Query(default=False),
    admin_email: str = Depends(require_admin),
) -> AdminOverviewResponse:
    cached = _overview_cache.get(admin_email)
    now = time.monotonic()
    if not force_refresh and cached and now - cached[0] < _OVERVIEW_CACHE_SECONDS:
        return cached[1]

    tasks = (
        _load_overview_widget("products", admin_products),
        _load_overview_widget("categories", admin_categories),
        _load_overview_widget("orders", _all_admin_orders),
        _load_overview_widget("coupons", admin_coupons),
        _load_overview_widget("reviews", _overview_reviews),
        _load_overview_widget("hero_images", _list_hero_images),
        _load_overview_widget("analytics", analytics_summary),
    )
    results = await asyncio.gather(*tasks)
    response = AdminOverviewResponse(
        data={
            name: value
            for name, value, _ in results
        },
        errors={name: error for name, _, error in results if error is not None},
    )
    _overview_cache[admin_email] = (time.monotonic(), response)
    return response


async def _hero_image_response(row: Any) -> dict[str, Any]:
    image = dict(row)
    image["url"] = await asyncio.to_thread(get_file_url, image["object_key"])
    return image


async def _list_hero_images(db: AsyncSession) -> list[dict[str, Any]]:
    result = await db.execute(
        select(hero_images_table).order_by(
            hero_images_table.c.sort_order,
            hero_images_table.c.created_at,
            hero_images_table.c.id,
        )
    )
    return await asyncio.gather(*(_hero_image_response(row) for row in result.mappings()))


@hero_images_router.get("/api/hero-images")
async def public_hero_images(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    return await _list_hero_images(db)


@router.get("/hero-images", dependencies=[Depends(require_admin)])
async def admin_hero_images(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    return await _list_hero_images(db)


@router.post("/hero-images", status_code=201, dependencies=[Depends(require_admin)])
async def create_hero_image(
    file: UploadFile = File(...),
    alt_text: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    hero_image_count = await db.scalar(select(func.count()).select_from(hero_images_table))
    if hero_image_count >= MAX_HERO_IMAGES:
        raise HTTPException(status_code=409, detail="A maximum of 6 hero images is allowed.")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")

    extension = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "img"
    if not re.fullmatch(r"[a-z0-9]{1,10}", extension):
        extension = "img"

    image_id = uuid4()
    filename_source = alt_text.strip() or file.filename or "hero-image"
    filename = build_image_filename(filename_source, extension)
    try:
        object_key = await asyncio.to_thread(build_unique_object_key, "hero", filename)
        upload_file(file.file, object_key, file.content_type)
    except Exception as exc:
        logger.exception("Homepage hero image upload to RustFS failed.")
        raise HTTPException(
            status_code=502,
            detail="Hero image storage upload failed. Check the RustFS endpoint, credentials, and bucket configuration.",
        ) from exc

    try:
        next_sort_order = await db.scalar(
            select(func.coalesce(func.max(hero_images_table.c.sort_order), -1) + 1)
        )
        result = await db.execute(
            insert(hero_images_table)
            .values(
                id=image_id,
                object_key=object_key,
                alt_text=alt_text.strip(),
                sort_order=next_sort_order,
                created_at=datetime.now(timezone.utc),
            )
            .returning(hero_images_table)
        )
        await db.commit()
    except Exception:
        await db.rollback()
        logger.exception("Failed to save homepage hero image metadata.")
        try:
            delete_object(object_key)
        except Exception:
            logger.exception(
                "Failed to clean up an unreferenced homepage hero image.",
                extra={"object_key": object_key},
            )
        raise

    return await _hero_image_response(result.mappings().one())


@router.delete(
    "/hero-images/{image_id}",
    status_code=204,
    dependencies=[Depends(require_admin)],
)
async def delete_hero_image(image_id: UUID, db: AsyncSession = Depends(get_db)) -> Response:
    result = await db.execute(
        select(hero_images_table.c.object_key).where(hero_images_table.c.id == image_id)
    )
    object_key = result.scalar_one_or_none()
    if object_key is None:
        raise HTTPException(status_code=404, detail="Hero image not found.")

    await db.execute(delete(hero_images_table).where(hero_images_table.c.id == image_id))
    await db.commit()
    await delete_unreferenced_objects(
        db,
        {object_key},
        context=f"hero-image:{image_id}",
    )
    return Response(status_code=204)


class HeroImageUpdate(BaseModel):
    alt_text: str = Field(default="", max_length=500)
    sort_order: int = Field(ge=0)


@router.put(
    "/hero-images/{image_id}",
    dependencies=[Depends(require_admin)],
)
async def update_hero_image(
    image_id: UUID,
    payload: HeroImageUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(
        update(hero_images_table)
        .where(hero_images_table.c.id == image_id)
        .values(alt_text=payload.alt_text.strip(), sort_order=payload.sort_order)
        .returning(hero_images_table)
    )
    image = result.mappings().first()
    if image is None:
        raise HTTPException(status_code=404, detail="Hero image not found.")
    await db.commit()
    return await _hero_image_response(image)


class VariantInput(BaseModel):
    id: UUID | None = None
    pack_size: str = Field(min_length=1, max_length=32)
    price: Decimal = Field(ge=0)
    mrp: Decimal = Field(ge=0)
    stock_qty: int = Field(ge=0)
    sku: str = Field(min_length=1, max_length=64)
    batch_no: str | None = None
    expiry_date: date | None = None


class ComboCatalogProductInput(BaseModel):
    product_id: UUID
    variant_id: UUID
    quantity: int = Field(ge=1, le=20)


class ProductFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID | None = None
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255)
    description: str | None = None
    spice_level: str = "mild"
    status: str = "active"
    variants: list[VariantInput] = Field(default_factory=list)
    images: list[str] = Field(default_factory=list)
    categories: list[str] = Field(default_factory=list)

    @field_validator("images")
    @classmethod
    def validate_image_keys(cls, images: list[str]) -> list[str]:
        valid_prefixes = (
            "products/",
            "combos/",
            "hero/",
            "homepage/",
            "blog/",
            "recipes/",
            "masalafolder/products/",
            "masalafolder/combos/",
            "masalafolder/hero/",
            "masalafolder/homepage/",
            "masalafolder/blog/",
            "masalafolder/recipes/",
        )
        if any(not image.startswith(valid_prefixes) for image in images):
            raise ValueError("Upload product or combo photos to RustFS and provide their image keys.")
        return images


class ProductInput(ProductFields):
    @model_validator(mode="after")
    def validate_variants(self) -> "ProductInput":
        if not self.variants:
            raise ValueError("A regular product must include at least one pack size.")
        return self


class ComboInput(ProductFields):
    price: Decimal = Field(ge=0)
    mrp: Decimal = Field(ge=0)
    discount_pct: int = Field(default=0, ge=0, le=100)
    combo_catalog_products: list[ComboCatalogProductInput] = Field(default_factory=list, max_length=48)
    dish_type: str | None = None
    is_veg: bool = True

    @model_validator(mode="after")
    def validate_combo_contents(self) -> "ComboInput":
        if not self.combo_catalog_products:
            raise ValueError("A combo must include at least one product.")
        if self.price >= self.mrp:
            raise ValueError("The combo price must be lower than the combined regular price.")
        if len({item.variant_id for item in self.combo_catalog_products}) != len(
            self.combo_catalog_products
        ):
            raise ValueError("A regular product pack can only be added once to a combo.")
        return self


class CategoryInput(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255)
    type: str = "product_type"
    description: str | None = None
    image_key: str | None = None

    @field_validator("image_key")
    @classmethod
    def validate_collection_image_key(cls, image_key: str | None) -> str | None:
        if image_key is not None and not image_key.startswith(
            ("collections/", "masalafolder/collections/")
        ):
            raise ValueError("Upload collection images to RustFS and provide their image keys.")
        return image_key


class OrderLineAdjustment(BaseModel):
    product_id: UUID
    variant_id: UUID | None = None
    qty: int = Field(ge=1, le=20)
    price: Decimal | None = Field(default=None, ge=0)


class OrderReviewInput(BaseModel):
    status: Literal["placed", "processing", "shipped", "delivered"]
    tracking_id: str | None = Field(default=None, max_length=128)
    courier_partner: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=2000)
    admin_note: str | None = Field(default=None, max_length=2000)
    payment_note: str | None = Field(default=None, max_length=2000)
    items: list[OrderLineAdjustment] | None = None


class CouponInput(BaseModel):
    code: str = Field(min_length=1, max_length=40)
    kind: Literal["percentage", "fixed", "buy_x_get_y", "combo"]
    label: str = Field(default="", max_length=255)
    discount_value: Decimal = Field(default=Decimal("0"), ge=0)
    minimum_order: Decimal = Field(default=Decimal("0"), ge=0)
    max_discount: Decimal | None = Field(default=None, ge=0)
    active: bool = True
    starts_at: date | None = None
    ends_at: date | None = None
    buy_quantity: int = Field(default=0, ge=0)
    free_quantity: int = Field(default=0, ge=0)
    eligible_terms: list[str] = Field(default_factory=list)
    first_order_only: bool = False
    percentage: Decimal | None = Field(default=None, ge=0, le=100)
    fixed_amount: Decimal | None = Field(default=None, ge=0)
    active_from: date | None = None
    active_until: date | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def validate_combo_configuration(self) -> "CouponInput":
        self.code = self.code.strip().upper()
        if not self.code:
            raise ValueError("Enter a promotion code.")
        self.label = self.label.strip() or self.code
        self.eligible_terms = [term.strip() for term in self.eligible_terms if term.strip()]
        if self.kind == "percentage":
            value = self.percentage if self.percentage is not None else self.discount_value
            if value <= 0 or value > 100:
                raise ValueError("Percentage discount must be between 0 and 100.")
        elif self.kind == "fixed":
            value = self.fixed_amount if self.fixed_amount is not None else self.discount_value
            if value <= 0:
                raise ValueError("Enter a discount amount greater than zero.")
        if self.kind in {"buy_x_get_y", "combo"} and (
            self.buy_quantity < 1
            or self.free_quantity < 1
            or not any(term.strip() for term in self.eligible_terms)
        ):
            raise ValueError(
                "Combo offers require at least one eligible term, one buy quantity, and one free quantity."
            )
        if self.starts_at and self.ends_at and self.ends_at < self.starts_at:
            raise ValueError("The end date must be on or after the start date.")
        return self

    @model_validator(mode="before")
    @classmethod
    def accept_frontend_coupon_fields(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            return value
        normalized = dict(value)
        normalized.setdefault("active", normalized.get("is_active", True))
        normalized.setdefault("starts_at", normalized.get("active_from"))
        normalized.setdefault("ends_at", normalized.get("active_until"))
        kind = normalized.get("kind")
        if kind == "percentage" and "discount_value" not in normalized:
            normalized["discount_value"] = normalized.get("percentage") or 0
        if kind == "fixed" and "discount_value" not in normalized:
            normalized["discount_value"] = normalized.get("fixed_amount") or 0
        if normalized.get("is_active") is None:
            normalized["is_active"] = normalized.get("active", True)
        return normalized


class ReviewStatusInput(BaseModel):
    status: Literal["approved", "rejected", "pending"]


@router.post("/login")
async def admin_login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    result = await db.execute(
        select(admin_users_table).where(
            admin_users_table.c.email == payload.email,
            admin_users_table.c.is_active.is_(True),
        )
    )
    admin = result.mappings().first()
    if admin is None or not verify_password(payload.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"access_token": issue_token(admin["email"]), "token_type": "bearer"}


@router.get("/registration-status")
async def admin_registration_status(db: AsyncSession = Depends(get_db)) -> dict[str, bool]:
    count_result = await db.execute(select(admin_users_table.c.id))
    admins_exist = count_result.first() is not None
    return {"admins_exist": admins_exist}


class UpdateNotificationSettingsRequest(BaseModel):
    sms_enabled: bool
    sms_account_sid: str = Field(default="", max_length=255)
    sms_auth_token: str | None = Field(default=None, max_length=500)
    sms_sender_phone: str = Field(default="", max_length=32)
    google_apps_script_url: str = Field(default="", max_length=2048)
    email_sender_email: str = Field(default="", max_length=254)

    @field_validator(
        "sms_account_sid",
        "sms_sender_phone",
        "sms_auth_token",
        "google_apps_script_url",
        "email_sender_email",
    )
    @classmethod
    def trim_notification_values(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("google_apps_script_url")
    @classmethod
    def validate_google_apps_script_url(cls, value: str) -> str:
        if not value:
            return value
        try:
            parsed = URL(value)
        except InvalidURL as error:
            raise ValueError(
                "Use the HTTPS URL of a deployed Google Apps Script web app."
            ) from error
        if (
            parsed.scheme != "https"
            or parsed.host != "script.google.com"
            or not parsed.path.startswith("/macros/s/")
            or not parsed.path.endswith("/exec")
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError(
                "Use the HTTPS URL of a deployed Google Apps Script web app."
            )
        return value

    @field_validator("email_sender_email")
    @classmethod
    def validate_email_sender_email(cls, value: str) -> str:
        if value and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid sender email address.")
        return value.casefold()


@router.get("/integration-settings", dependencies=[Depends(require_admin)])
async def get_admin_integration_settings(
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool | str]:
    return (await get_notification_settings(db)).admin_response()


@router.put("/integration-settings", dependencies=[Depends(require_admin)])
async def update_admin_notification_settings(
    payload: UpdateNotificationSettingsRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool | str]:
    excluded = postgresql_insert(notification_settings_table).excluded
    await db.execute(
        postgresql_insert(notification_settings_table)
        .values(
            id=1,
            sms_enabled=payload.sms_enabled,
            sms_account_sid=payload.sms_account_sid,
            sms_auth_token=payload.sms_auth_token,
            sms_sender_phone=payload.sms_sender_phone,
            google_apps_script_url=payload.google_apps_script_url,
            email_sender_email=payload.email_sender_email or None,
        )
        .on_conflict_do_update(
            index_elements=[notification_settings_table.c.id],
            set_={
                "sms_enabled": excluded.sms_enabled,
                "sms_account_sid": excluded.sms_account_sid,
                "sms_auth_token": func.coalesce(
                    excluded.sms_auth_token,
                    notification_settings_table.c.sms_auth_token,
                ),
                "sms_sender_phone": excluded.sms_sender_phone,
                "google_apps_script_url": excluded.google_apps_script_url,
                "email_sender_email": excluded.email_sender_email,
            },
        )
    )
    await db.commit()
    return (await get_notification_settings(db)).admin_response()


@router.post("/register", status_code=201)
async def register_admin(
    payload: RegisterAdminRequest,
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    first_admin_registration = credentials is None
    try:
        is_loopback_request = request.client is not None and ip_address(
            request.client.host
        ).is_loopback
    except ValueError:
        is_loopback_request = False
    if first_admin_registration and not is_loopback_request:
        raise HTTPException(
            status_code=403,
            detail="First-admin registration is available only from this computer.",
        )

    try:
        async with db.begin():
            if first_admin_registration:
                await db.execute(text("SELECT pg_advisory_xact_lock(741928361)"))
                admin_result = await db.execute(select(admin_users_table.c.id).limit(1))
                if admin_result.first() is not None:
                    raise HTTPException(
                        status_code=403,
                        detail="First-admin registration is closed; sign in as an admin to register another account.",
                    )
            else:
                await require_admin(credentials, db)

            inserted = await db.execute(
                insert(admin_users_table)
                .values(
                    email=payload.email,
                    password_hash=hash_password(payload.password),
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                )
                .returning(admin_users_table.c.id, admin_users_table.c.email)
            )
            admin = inserted.mappings().one()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="An admin account with that email already exists.") from exc

    response: dict[str, Any] = {
        "id": admin["id"],
        "email": admin["email"],
        "role": "admin",
    }
    if first_admin_registration:
        response.update({
            "access_token": issue_token(admin["email"]),
            "token_type": "bearer",
        })
    return response


@router.get("/admins", dependencies=[Depends(require_admin)])
async def list_admins(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    result = await db.execute(
        select(
            admin_users_table.c.id,
            admin_users_table.c.email,
            admin_users_table.c.is_active,
            admin_users_table.c.created_at,
        ).order_by(admin_users_table.c.created_at, admin_users_table.c.id)
    )
    return [dict(row) for row in result.mappings()]


def _dump_product(payload: ProductInput | ComboInput) -> dict[str, Any]:
    excluded = {"id", "variants"}
    if isinstance(payload, ComboInput):
        excluded.add("combo_catalog_products")
    product = payload.model_dump(exclude=excluded)
    for field in ("images", "categories"):
        product[field] = product.get(field) or []
    return product


def _coupon_payload(payload: CouponInput) -> dict[str, Any]:
    values = payload.model_dump(exclude={
        "percentage", "fixed_amount", "active_from", "active_until", "is_active"
    })
    values["active"] = payload.is_active if payload.is_active is not None else payload.active
    values["starts_at"] = payload.active_from or payload.starts_at
    values["ends_at"] = payload.active_until or payload.ends_at
    if payload.kind == "percentage" and payload.percentage is not None:
        values["discount_value"] = payload.percentage
    elif payload.kind == "fixed" and payload.fixed_amount is not None:
        values["discount_value"] = payload.fixed_amount
    return values


def _coupon_response(row: Any) -> dict[str, Any]:
    coupon = dict(row)
    kind = coupon["kind"]
    coupon.update({
        "percentage": coupon["discount_value"] if kind == "percentage" else None,
        "fixed_amount": coupon["discount_value"] if kind == "fixed" else None,
        "first_order_only": coupon.get("first_order_only", False),
        "active_from": coupon.get("starts_at"),
        "active_until": coupon.get("ends_at"),
        "is_active": coupon["active"],
    })
    return coupon


def _order_line_key(item: dict[str, Any]) -> tuple[str, str | None]:
    return str(item["product_id"]), str(item["variant_id"]) if item.get("variant_id") is not None else None


def _adjustment_line_key(item: OrderLineAdjustment) -> tuple[str, str | None]:
    return str(item.product_id), str(item.variant_id) if item.variant_id is not None else None


async def _rebuild_order_items(
    db: AsyncSession,
    order: dict[str, Any],
    adjustments: list[OrderLineAdjustment],
) -> tuple[list[dict[str, Any]], Decimal]:
    if not adjustments:
        raise HTTPException(status_code=422, detail="An order must contain at least one item.")

    seen: set[tuple[str, str | None]] = set()
    for adjustment in adjustments:
        key = _adjustment_line_key(adjustment)
        if key in seen:
            raise HTTPException(status_code=422, detail="An order line item may only be included once.")
        seen.add(key)

    existing = {_order_line_key(item): item for item in order.get("items", [])}
    new_adjustments = [
        adjustment
        for adjustment in adjustments
        if _adjustment_line_key(adjustment) not in existing
    ]
    if new_adjustments:
        raise HTTPException(
            status_code=422,
            detail="Products cannot be added to existing orders.",
        )

    adjusted: list[dict[str, Any]] = []
    subtotal = Decimal("0")
    for adjustment in adjustments:
        key = _adjustment_line_key(adjustment)
        previous = existing[key]
        if adjustment.qty > int(previous["qty"]) and adjustment.variant_id is not None:
            stock_result = await db.execute(
                select(variants_table.c.stock_qty).where(
                    variants_table.c.id == adjustment.variant_id,
                    variants_table.c.product_id == adjustment.product_id,
                )
            )
            available_stock = stock_result.scalar_one_or_none()
            if available_stock is not None and adjustment.qty - int(previous["qty"]) > int(available_stock):
                raise HTTPException(
                    status_code=422,
                    detail=f"Only {int(available_stock)} additional unit(s) remain for {previous.get('pack_size', 'this pack')}.",
                )
        price = (
            adjustment.price
            if "price" in adjustment.model_fields_set and adjustment.price is not None
            else Decimal(str(previous["price"]))
        )
        line = dict(previous)
        line.update({
            "qty": adjustment.qty,
            "price": float(price),
            "line_total": float(price * adjustment.qty),
        })
        adjusted.append(line)
        subtotal += price * adjustment.qty
    return adjusted, subtotal


async def _replace_variants(db: AsyncSession, product_id: UUID, variants: list[VariantInput]) -> None:
    ids = {v.id for v in variants if v.id is not None}
    if ids:
        existing = await db.execute(
            select(variants_table.c.id).where(
                variants_table.c.product_id == product_id, variants_table.c.id.in_(ids)
            )
        )
        if {row[0] for row in existing} != ids:
            raise HTTPException(status_code=422, detail="Variant does not belong to this product.")
    removed_result = await db.execute(
        select(variants_table.c.id).where(
            variants_table.c.product_id == product_id,
            variants_table.c.id.not_in(ids) if ids else True,
        )
    )
    removed_ids = [row[0] for row in removed_result]
    if removed_ids:
        combo_reference = await db.execute(
            select(combos_table.c.id, combos_table.c.catalog_products)
        )
        removed_variant_ids = {str(variant_id) for variant_id in removed_ids}
        if any(
            component.get("variant_id") in removed_variant_ids
            for row in combo_reference.mappings()
            for component in row["catalog_products"]
        ):
            raise HTTPException(
                status_code=409,
                detail="Remove this pack from its combos before deleting it.",
            )
    await db.execute(delete(variants_table).where(
        variants_table.c.product_id == product_id,
        variants_table.c.id.not_in(ids) if ids else True,
    ))
    for variant in variants:
        values = variant.model_dump(exclude={"id"})
        if variant.id is None:
            values["product_id"] = product_id
            await db.execute(insert(variants_table).values(**values))
        else:
            await db.execute(update(variants_table).where(
                variants_table.c.id == variant.id,
                variants_table.c.product_id == product_id,
            ).values(**values))


async def _validate_combo_catalog_products(
    db: AsyncSession,
    payload: ComboInput,
) -> None:
    variant_ids = [item.variant_id for item in payload.combo_catalog_products]
    if len(set(variant_ids)) != len(variant_ids):
        raise HTTPException(status_code=422, detail="A regular product pack can only be added once to a combo.")

    catalog_rows: dict[UUID, dict[str, Any]] = {}
    if variant_ids:
        result = await db.execute(
            select(
                variants_table.c.id,
                variants_table.c.product_id,
                variants_table.c.mrp,
                products_table.c.name,
                products_table.c.status,
            )
            .join(products_table, products_table.c.id == variants_table.c.product_id)
            .where(variants_table.c.id.in_(variant_ids))
        )
        catalog_rows = {row["id"]: dict(row) for row in result.mappings()}
        if set(catalog_rows) != set(variant_ids):
            raise HTTPException(status_code=422, detail="A selected regular product pack is unavailable.")

    total_mrp = Decimal("0")
    for item in payload.combo_catalog_products:
        row = catalog_rows[item.variant_id]
        if row["product_id"] != item.product_id:
            raise HTTPException(status_code=422, detail="A selected pack does not match its product.")
        if str(row["status"] or "active").lower() != "active":
            raise HTTPException(status_code=422, detail=f"{row['name']} is not currently available.")
        total_mrp += Decimal(str(row["mrp"])) * item.quantity

    if payload.mrp != total_mrp:
        raise HTTPException(
            status_code=422,
            detail="The combo MRP must equal the total value of its included packs.",
        )
    if payload.price >= total_mrp:
        raise HTTPException(
            status_code=422,
            detail="The combo price must be lower than the combined regular price.",
        )


async def _replace_combo_catalog_products(
    db: AsyncSession,
    combo_id: UUID,
    products: list[ComboCatalogProductInput],
) -> None:
    catalog_products = [
        {
            "id": str(uuid4()),
            "product_id": str(item.product_id),
            "variant_id": str(item.variant_id),
            "quantity": item.quantity,
            "sort_order": sort_order,
        }
        for sort_order, item in enumerate(products)
    ]
    await db.execute(
        update(combos_table)
        .where(combos_table.c.id == combo_id)
        .values(catalog_products=catalog_products)
    )


async def _ensure_catalog_slug_available(
    db: AsyncSession,
    slug: str,
    *,
    exclude_id: UUID | None = None,
) -> None:
    for table in (products_table, combos_table):
        statement = select(table.c.id).where(table.c.slug == slug)
        if exclude_id is not None:
            statement = statement.where(table.c.id != exclude_id)
        if (await db.execute(statement)).scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="A product or combo with that URL slug already exists.")


async def _unique_error(db: AsyncSession, exc: IntegrityError) -> None:
    await db.rollback()
    raise HTTPException(status_code=409, detail="A product, category, SKU, or coupon with that identifier already exists.") from exc


@router.get("/products", dependencies=[Depends(require_admin)])
async def admin_products(
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    product_result = await db.execute(select(products_table).order_by(products_table.c.name))
    combo_result = await db.execute(select(combos_table).order_by(combos_table.c.name))
    products = [
        {**dict(row), "is_combo": False}
        for row in product_result.mappings()
    ] + [
        {**dict(row), "is_combo": True, "ingredients": []}
        for row in combo_result.mappings()
    ]
    return await hydrate_products(db, products)


@router.post("/products", status_code=201, dependencies=[Depends(require_admin)])
async def create_product(payload: ProductInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    try:
        await _ensure_catalog_slug_available(db, payload.slug)
        values = _dump_product(payload)
        if payload.id is not None:
            values["id"] = payload.id
        values["created_at"] = datetime.now()
        values["updated_at"] = datetime.now()
        product_id = (await db.execute(insert(products_table).values(**values).returning(products_table.c.id))).scalar_one()
        await _replace_variants(db, product_id, payload.variants)
        await db.commit()
    except IntegrityError as exc:
        await _unique_error(db, exc)
    result = await db.execute(select(products_table).where(products_table.c.id == product_id))
    return (await hydrate_products(db, [dict(result.mappings().one())]))[0]


@router.put("/products/{product_id}", dependencies=[Depends(require_admin)])
async def update_product(product_id: UUID, payload: ProductInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    try:
        await _ensure_catalog_slug_available(db, payload.slug, exclude_id=product_id)
        existing = await db.execute(
            select(products_table.c.id, products_table.c.images).where(products_table.c.id == product_id)
        )
        previous_product = existing.mappings().first()
        if previous_product is None:
            raise HTTPException(status_code=404, detail="Product not found.")
        values = _dump_product(payload)
        values["updated_at"] = datetime.now()
        await db.execute(update(products_table).where(products_table.c.id == product_id).values(**values))
        await _replace_variants(db, product_id, payload.variants)
        await db.commit()
    except IntegrityError as exc:
        await _unique_error(db, exc)
    previous_image_keys = {
        key
        for image in (previous_product["images"] or [])
        if (key := get_object_key(image)) is not None
    }
    current_image_keys = {
        key
        for image in values["images"]
        if (key := get_object_key(image)) is not None
    }
    await delete_unreferenced_objects(
        db,
        previous_image_keys - current_image_keys,
        context=f"product:{product_id}",
    )
    result = await db.execute(select(products_table).where(products_table.c.id == product_id))
    return (await hydrate_products(db, [dict(result.mappings().one())]))[0]


@router.delete("/products/{product_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_product(product_id: UUID, db: AsyncSession = Depends(get_db)) -> None:
    existing = await db.execute(
        select(products_table.c.images).where(products_table.c.id == product_id)
    )
    previous_images = existing.scalar_one_or_none()
    if previous_images is None and not await db.scalar(
        select(products_table.c.id).where(products_table.c.id == product_id)
    ):
        raise HTTPException(status_code=404, detail="Product not found.")
    combo_reference = await db.execute(
        select(combos_table.c.id, combos_table.c.catalog_products)
    )
    if any(
        component.get("product_id") == str(product_id)
        for row in combo_reference.mappings()
        for component in row["catalog_products"]
    ):
        raise HTTPException(
            status_code=409,
            detail="Remove this product from its combos before deleting it.",
        )
    result = await db.execute(delete(products_table).where(products_table.c.id == product_id))
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Product not found.")
    await db.commit()
    await delete_unreferenced_objects(
        db,
        {
            key
            for image in (previous_images or [])
            if (key := get_object_key(image)) is not None
        },
        context=f"product:{product_id}",
    )


@router.get("/combos", dependencies=[Depends(require_admin)])
async def admin_combos(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    result = await db.execute(select(combos_table).order_by(combos_table.c.name))
    combos = [
        {**dict(row), "is_combo": True, "ingredients": []}
        for row in result.mappings()
    ]
    return await hydrate_products(db, combos)


@router.post("/combos", status_code=201, dependencies=[Depends(require_admin)])
async def create_combo(payload: ComboInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    try:
        await _validate_combo_catalog_products(db, payload)
        await _ensure_catalog_slug_available(db, payload.slug)
        values = _dump_product(payload)
        if payload.id is not None:
            values["id"] = payload.id
        values["created_at"] = datetime.now()
        values["updated_at"] = datetime.now()
        combo_id = (
            await db.execute(
                insert(combos_table)
                .values(**values)
                .returning(combos_table.c.id)
            )
        ).scalar_one()
        await _replace_combo_catalog_products(db, combo_id, payload.combo_catalog_products)
        await db.commit()
    except IntegrityError as exc:
        await _unique_error(db, exc)
    result = await db.execute(select(combos_table).where(combos_table.c.id == combo_id))
    combo = {**dict(result.mappings().one()), "is_combo": True, "ingredients": []}
    return (await hydrate_products(db, [combo]))[0]


@router.put("/combos/{combo_id}", dependencies=[Depends(require_admin)])
async def update_combo(
    combo_id: UUID,
    payload: ComboInput,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    try:
        await _validate_combo_catalog_products(db, payload)
        await _ensure_catalog_slug_available(db, payload.slug, exclude_id=combo_id)
        existing = await db.execute(
            select(combos_table.c.id, combos_table.c.images)
            .where(combos_table.c.id == combo_id)
        )
        previous_combo = existing.mappings().first()
        if previous_combo is None:
            raise HTTPException(status_code=404, detail="Combo not found.")
        values = _dump_product(payload)
        values["updated_at"] = datetime.now()
        await db.execute(
            update(combos_table)
            .where(combos_table.c.id == combo_id)
            .values(**values)
        )
        await _replace_combo_catalog_products(db, combo_id, payload.combo_catalog_products)
        await db.commit()
    except IntegrityError as exc:
        await _unique_error(db, exc)
    previous_image_keys = {
        key
        for image in (previous_combo["images"] or [])
        if (key := get_object_key(image)) is not None
    }
    current_image_keys = {
        key
        for image in values["images"]
        if (key := get_object_key(image)) is not None
    }
    await delete_unreferenced_objects(
        db,
        previous_image_keys - current_image_keys,
        context=f"combo:{combo_id}",
    )
    result = await db.execute(select(combos_table).where(combos_table.c.id == combo_id))
    combo = {**dict(result.mappings().one()), "is_combo": True, "ingredients": []}
    return (await hydrate_products(db, [combo]))[0]


@router.delete("/combos/{combo_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_combo(combo_id: UUID, db: AsyncSession = Depends(get_db)) -> None:
    existing = await db.execute(
        select(combos_table.c.images).where(combos_table.c.id == combo_id)
    )
    previous_images = existing.scalar_one_or_none()
    if previous_images is None and not await db.scalar(
        select(combos_table.c.id).where(combos_table.c.id == combo_id)
    ):
        raise HTTPException(status_code=404, detail="Combo not found.")
    result = await db.execute(delete(combos_table).where(combos_table.c.id == combo_id))
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Combo not found.")
    await db.commit()
    await delete_unreferenced_objects(
        db,
        {
            key
            for image in (previous_images or [])
            if (key := get_object_key(image)) is not None
        },
        context=f"combo:{combo_id}",
    )


@router.get("/recipes", dependencies=[Depends(require_admin)])
async def admin_recipes(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    result = await db.execute(select(recipes_table).order_by(recipes_table.c.title))
    return [await _recipe_response(dict(row)) for row in result.mappings()]


@router.post("/recipes", status_code=201, dependencies=[Depends(require_admin)])
async def create_recipe(
    payload: RecipeInput,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    try:
        result = await db.execute(
            insert(recipes_table)
            .values(**{
                **payload.model_dump(exclude={"hero_image_key"}),
                "hero_image_url": payload.hero_image_key,
            })
            .returning(recipes_table)
        )
        recipe = dict(result.mappings().one())
        await db.commit()
        return recipe
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A recipe with that URL slug already exists.",
        ) from exc


async def _update_recipe_homepage_references(
    db: AsyncSession,
    old_slug: str,
    new_slug: str | None,
) -> None:
    settings_id = (
        select(homepage_settings_table.c.id)
        .order_by(homepage_settings_table.c.id)
        .limit(1)
        .scalar_subquery()
    )
    settings_result = await db.execute(
        select(homepage_settings_table.c.content)
        .where(homepage_settings_table.c.id == settings_id)
        .with_for_update()
    )
    homepage_content = settings_result.scalar_one_or_none()
    if homepage_content is None:
        return

    homepage_content = dict(homepage_content)
    recipe_content = dict(homepage_content.get("recipes") or {})
    selected_slugs = recipe_content.get("recipe_slugs", [])
    if new_slug is None:
        recipe_content["recipe_slugs"] = [
            slug for slug in selected_slugs if slug != old_slug
        ]
    else:
        recipe_content["recipe_slugs"] = list(dict.fromkeys(
            new_slug if slug == old_slug else slug
            for slug in selected_slugs
        ))
    homepage_content["recipes"] = recipe_content
    await db.execute(
        update(homepage_settings_table)
        .where(homepage_settings_table.c.id == settings_id)
        .values(content=homepage_content, updated_at=datetime.now(timezone.utc))
    )


@router.put("/recipes/{recipe_id}", dependencies=[Depends(require_admin)])
async def update_recipe(
    recipe_id: UUID,
    payload: RecipeInput,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    try:
        previous_result = await db.execute(
            select(recipes_table.c.slug, recipes_table.c.hero_image_url)
            .where(recipes_table.c.id == recipe_id)
        )
        previous_recipe = previous_result.mappings().first()
        if previous_recipe is None:
            raise HTTPException(status_code=404, detail="Recipe not found.")
        old_slug = previous_recipe["slug"]
        result = await db.execute(
            update(recipes_table)
            .where(recipes_table.c.id == recipe_id)
            .values(**{
                **payload.model_dump(exclude={"hero_image_key"}),
                "hero_image_url": payload.hero_image_key,
            })
            .returning(recipes_table)
        )
        recipe = result.mappings().first()
        if recipe is None:
            raise HTTPException(status_code=404, detail="Recipe not found.")
        if old_slug != payload.slug:
            await _update_recipe_homepage_references(db, old_slug, payload.slug)
        await db.commit()
        previous_image_key = get_object_key(previous_recipe["hero_image_url"])
        current_image_key = get_object_key(payload.hero_image_key)
        replaced_image_keys = (
            {previous_image_key} - {current_image_key}
            if previous_image_key
            else set()
        )
        await delete_unreferenced_objects(
            db,
            replaced_image_keys,
            context=f"recipe:{recipe_id}",
        )
        return dict(recipe)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A recipe with that URL slug already exists.",
        ) from exc


@router.delete("/recipes/{recipe_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_recipe(recipe_id: UUID, db: AsyncSession = Depends(get_db)) -> None:
    recipe_result = await db.execute(
        select(recipes_table.c.slug, recipes_table.c.hero_image_url)
        .where(recipes_table.c.id == recipe_id)
    )
    recipe = recipe_result.mappings().first()
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found.")
    await db.execute(delete(recipes_table).where(recipes_table.c.id == recipe_id))
    await _update_recipe_homepage_references(db, recipe["slug"], None)
    await db.commit()
    image_key = get_object_key(recipe["hero_image_url"])
    await delete_unreferenced_objects(
        db,
        {image_key} if image_key else set(),
        context=f"recipe:{recipe_id}",
    )


@router.get("/categories", dependencies=[Depends(require_admin)])
async def admin_categories(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    result = await db.execute(select(categories_table).order_by(categories_table.c.name))
    return await asyncio.gather(*(category_response(row) for row in result.mappings()))


@router.post("/categories", status_code=201, dependencies=[Depends(require_admin)])
async def create_category(payload: CategoryInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    try:
        result = await db.execute(insert(categories_table).values(**payload.model_dump()).returning(categories_table))
        await db.commit()
    except IntegrityError as exc:
        await _unique_error(db, exc)
    return await category_response(result.mappings().one())


@router.put("/categories/{category_id}", dependencies=[Depends(require_admin)])
async def update_category(category_id: UUID, payload: CategoryInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    existing = await db.execute(
        select(categories_table.c.image_key).where(categories_table.c.id == category_id)
    )
    previous_image_key = existing.scalar_one_or_none()
    if previous_image_key is None and not await db.scalar(
        select(categories_table.c.id).where(categories_table.c.id == category_id)
    ):
        raise HTTPException(status_code=404, detail="Category not found.")
    try:
        await db.execute(update(categories_table).where(categories_table.c.id == category_id).values(**payload.model_dump()))
        await db.commit()
    except IntegrityError as exc:
        await _unique_error(db, exc)
    result = await db.execute(select(categories_table).where(categories_table.c.id == category_id))
    category = result.mappings().first()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found.")
    if previous_image_key and previous_image_key != payload.image_key:
        object_key = get_object_key(previous_image_key)
        if object_key:
            await delete_unreferenced_objects(
                db,
                {object_key},
                context=f"category:{category_id}",
            )
    return await category_response(category)


@router.delete("/categories/{category_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_category(category_id: UUID, db: AsyncSession = Depends(get_db)) -> None:
    existing = await db.execute(
        select(categories_table.c.image_key).where(categories_table.c.id == category_id)
    )
    image_key = existing.scalar_one_or_none()
    result = await db.execute(delete(categories_table).where(categories_table.c.id == category_id))
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Category not found.")
    await db.commit()
    object_key = get_object_key(image_key)
    if object_key:
        await delete_unreferenced_objects(
            db,
            {object_key},
            context=f"category:{category_id}",
        )


@router.get("/orders", dependencies=[Depends(require_admin)])
async def admin_orders(
    status: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    statement = select(orders_table).order_by(orders_table.c.created_at.desc()).limit(limit).offset(offset)
    if status:
        statement = statement.where(orders_table.c.status == status)
    result = await db.execute(statement)
    orders = []
    for row in result.mappings():
        order = dict(row)
        # Load items
        items_result = await db.execute(
            select(order_items_table).where(order_items_table.c.order_id == order["id"])
        )
        order["items"] = [dict(item) for item in items_result.mappings()]
        # Load history
        history_result = await db.execute(
            select(order_history_table)
            .where(order_history_table.c.order_id == order["id"])
            .order_by(order_history_table.c.changed_at)
        )
        order["history"] = [dict(event) for event in history_result.mappings()]
        orders.append(order)
    return orders


@router.put("/orders/{order_id}", dependencies=[Depends(require_admin)])
@router.patch("/orders/{order_id}", dependencies=[Depends(require_admin)])
async def review_order(order_id: UUID, payload: OrderReviewInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    allowed = {
        "placed": {"processing"},
        "processing": {"shipped"},
        "shipped": {"delivered"},
        "delivered": set(),
    }
    # The admin-auth dependency has already queried with this shared session.
    await db.commit()
    async with db.begin():
        result = await db.execute(select(orders_table).where(orders_table.c.id == order_id).with_for_update())
        row = result.mappings().first()
        if row is None:
            raise HTTPException(status_code=404, detail="Order not found.")
        order = dict(row)
        current = str(order["status"])
        if payload.status != current and payload.status not in allowed.get(current, set()):
            raise HTTPException(status_code=409, detail=f"Invalid order transition: {current} to {payload.status}.")
        if current == "processing" and payload.status == "shipped":
            tracking_id = (payload.tracking_id or "").strip()
            courier_partner = (payload.courier_partner or "").strip()
            if not tracking_id or not courier_partner:
                raise HTTPException(
                    status_code=422,
                    detail="Enter both the shipment tracking ID and courier partner before shipping this order.",
                )
            order["tracking_id"] = tracking_id
            order["courier_partner"] = courier_partner
        elif payload.tracking_id is not None:
            order["tracking_id"] = payload.tracking_id.strip() or order.get("tracking_id")
        if payload.courier_partner is not None:
            order["courier_partner"] = payload.courier_partner.strip() or order.get("courier_partner")
        if payload.items is not None:
            # Load existing items
            items_result = await db.execute(
                select(order_items_table).where(order_items_table.c.order_id == order_id)
            )
            existing_items = [dict(item) for item in items_result.mappings()]
            order["items"] = existing_items

            adjusted, subtotal = await _rebuild_order_items(db, order, payload.items)
            order["items"] = adjusted
            order["item_count"] = sum(item["qty"] for item in adjusted)
            order["subtotal"] = float(subtotal)
            discount = min(
                subtotal,
                max(Decimal("0"), Decimal(str(order.get("discount_amount", 0)))),
            )
            order["discount_amount"] = float(discount)
            discounted_subtotal = max(Decimal("0"), subtotal - discount)
            try:
                shipping = calculate_shipping(
                    discounted_subtotal,
                    order.get("delivery_mode", "domestic"),
                    order.get("country_code", "IN"),
                )
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=str(exc)) from exc
            order["shipping_amount"] = float(shipping)
            order["total"] = float(discounted_subtotal + shipping)

            # Replace order items in database
            await db.execute(delete(order_items_table).where(order_items_table.c.order_id == order_id))
            for item in adjusted:
                await db.execute(insert(order_items_table).values(
                    order_id=order_id,
                    product_id=item.get("product_id"),
                    variant_id=item.get("variant_id"),
                    name=item.get("name"),
                    pack_size=item.get("pack_size"),
                    sku=item.get("sku"),
                    dish_type=item.get("dish_type"),
                    categories=item.get("categories", []),
                    price=item["price"],
                    qty=item["qty"],
                    line_total=item["line_total"],
                ))

        previous = order["status"]
        order["status"] = payload.status

        # Add history entry
        history_entry = {
            "id": str(uuid4()),
            "status": payload.status,
            "changed_at": datetime.now(timezone.utc).isoformat(),
            "note": payload.note or (
                f"Shipped with {order['courier_partner']} (tracking ID: {order['tracking_id']})."
                if previous == "processing" and payload.status == "shipped"
                else f"Status changed from {previous} to {payload.status}."
                if previous != payload.status
                else "Order details updated."
            ),
        }
        await db.execute(insert(order_history_table).values(
            order_id=order_id,
            status=payload.status,
            changed_at=datetime.now(timezone.utc),
            note=history_entry["note"],
        ))

        note = payload.note if payload.note is not None else payload.admin_note
        if payload.admin_note is not None:
            order["admin_note"] = payload.admin_note
        if payload.payment_note is not None:
            order["payment_note"] = payload.payment_note
        elif note and ("offline" in note.casefold() or "payment" in note.casefold()):
            order["payment_note"] = note
        if note:
            order["admin_note"] = note

        await db.execute(update(orders_table).where(orders_table.c.id == order_id).values(
            status=payload.status,
            total=order["total"],
            subtotal=order.get("subtotal", 0),
            shipping_amount=order.get("shipping_amount", 0),
            discount_amount=order.get("discount_amount", 0),
            item_count=order.get("item_count", 0),
            admin_note=order.get("admin_note"),
            payment_note=order.get("payment_note"),
            tracking_id=order.get("tracking_id"),
            courier_partner=order.get("courier_partner"),
        ))

        # Load updated history
        history_result = await db.execute(
            select(order_history_table)
            .where(order_history_table.c.order_id == order_id)
            .order_by(order_history_table.c.changed_at)
        )
        order["history"] = [dict(event) for event in history_result.mappings()]

    if previous != payload.status:
        order["email_notification_status"] = await send_order_status_email(
            order,
            payload.status,
        )
    return order


@router.get("/coupons", dependencies=[Depends(require_admin)])
async def admin_coupons(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    result = await db.execute(select(coupons_table).order_by(coupons_table.c.code))
    return [_coupon_response(row) for row in result.mappings()]


@router.post("/coupons", status_code=201, dependencies=[Depends(require_admin)])
async def create_coupon(payload: CouponInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    values = _coupon_payload(payload)
    values["code"] = values["code"].strip().upper()
    try:
        result = await db.execute(insert(coupons_table).values(**values).returning(coupons_table))
        await db.commit()
    except IntegrityError as exc:
        await _unique_error(db, exc)
    return _coupon_response(result.mappings().one())


@router.put("/coupons/{coupon_id}", dependencies=[Depends(require_admin)])
async def update_coupon(coupon_id: UUID, payload: CouponInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    values = _coupon_payload(payload)
    values["code"] = values["code"].strip().upper()
    try:
        await db.execute(update(coupons_table).where(coupons_table.c.id == coupon_id).values(**values))
        await db.commit()
    except IntegrityError as exc:
        await _unique_error(db, exc)
    result = await db.execute(select(coupons_table).where(coupons_table.c.id == coupon_id))
    coupon = result.mappings().first()
    if coupon is None:
        raise HTTPException(status_code=404, detail="Coupon not found.")
    return _coupon_response(coupon)


@router.delete("/coupons/{coupon_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_coupon(coupon_id: UUID, db: AsyncSession = Depends(get_db)) -> None:
    result = await db.execute(delete(coupons_table).where(coupons_table.c.id == coupon_id))
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Coupon not found.")
    await db.commit()


@router.get("/reviews", dependencies=[Depends(require_admin)])
async def admin_reviews(
    status: Literal["pending", "approved", "rejected"] | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    statement = (
        select(
            reviews_table,
            products_table.c.name.label("product_name"),
            combos_table.c.name.label("combo_name"),
        )
        .outerjoin(products_table, products_table.c.id == reviews_table.c.product_id)
        .outerjoin(combos_table, combos_table.c.id == reviews_table.c.combo_id)
        .order_by(reviews_table.c.created_at.desc())
    )
    if status:
        statement = statement.where(reviews_table.c.status == status)
    result = await db.execute(statement)
    reviews = []
    for row in result.mappings():
        review = dict(row)
        product_name = review.pop("product_name")
        combo_name = review.pop("combo_name")
        review["product_name"] = product_name or combo_name
        reviews.append(review)
    return reviews


@router.put("/reviews/{review_id}", dependencies=[Depends(require_admin)])
@router.patch("/reviews/{review_id}", dependencies=[Depends(require_admin)])
async def moderate_review(review_id: UUID, payload: ReviewStatusInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    result = await db.execute(update(reviews_table).where(reviews_table.c.id == review_id).values(status=payload.status))
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Review not found.")
    await db.commit()
    row = await db.execute(select(reviews_table).where(reviews_table.c.id == review_id))
    return dict(row.mappings().one())
