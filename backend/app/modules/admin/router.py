"""Admin authentication and protected catalog/order/campaign/review operations."""

from datetime import date, datetime, timezone
from decimal import Decimal
from ipaddress import ip_address
import re
from typing import Any, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import delete, insert, select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import (
    admin_integration_settings_table,
    admin_users_table,
    categories_table,
    coupons_table,
    get_db,
    order_history_table,
    order_items_table,
    orders_table,
    products_table,
    reviews_table,
    variants_table,
)
from app.modules.admin.auth import bearer, hash_password, issue_token, require_admin, verify_password
from app.modules.admin.schemas import LoginRequest, RegisterAdminRequest
from app.modules.notifications.brevo import send_order_status_email
from app.modules.notifications.crypto import (
    InvalidToken,
    decrypt_integration_secret,
    integration_settings_cipher,
)
from app.modules.orders.catalog import CatalogValidationError, quote_order_items
from app.modules.orders.schemas import OrderItemInput
from app.modules.orders.shipping import calculate_shipping
from app.modules.products.router import hydrate_products

router = APIRouter(prefix="/api/admin", tags=["admin"])


class VariantInput(BaseModel):
    id: UUID | None = None
    pack_size: str = Field(min_length=1, max_length=32)
    price: Decimal = Field(ge=0)
    mrp: Decimal = Field(ge=0)
    stock_qty: int = Field(ge=0)
    sku: str = Field(min_length=1, max_length=64)
    batch_no: str | None = None
    expiry_date: date | None = None


class ProductInput(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255)
    description: str = ""
    ingredients: list[str] = Field(default_factory=list)
    price: Decimal = Field(ge=0)
    mrp: Decimal = Field(ge=0)
    discount_pct: int = Field(default=0, ge=0, le=100)
    spice_level: str = "mild"
    status: str = "active"
    variants: list[VariantInput] = Field(default_factory=list)
    images: list[str] = Field(default_factory=list)
    categories: list[str] = Field(default_factory=list)
    dish_type: str | None = None
    is_veg: bool = True
    contains_ginger_garlic: bool = False
    contains_tamarind: bool = False


class CategoryInput(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255)
    type: str = "product_type"
    description: str | None = None
    parent_id: UUID | None = None
    seo_title: str | None = None
    seo_description: str | None = None


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
    label: str = Field(min_length=1, max_length=255)
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
        if self.kind in {"buy_x_get_y", "combo"} and (
            self.buy_quantity < 1
            or self.free_quantity < 1
            or not any(term.strip() for term in self.eligible_terms)
        ):
            raise ValueError(
                "Combo offers require at least one eligible term, one buy quantity, and one free quantity."
            )
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


class AdminIntegrationSettingsInput(BaseModel):
    sms_enabled: bool | None = None
    email_enabled: bool | None = None
    sms_api_key: str | None = Field(default=None, min_length=1, max_length=4096)
    sms_account_sid: str | None = Field(default=None, min_length=1, max_length=64)
    sms_sender_phone: str | None = Field(default=None, max_length=32)
    email_api_key: str | None = Field(default=None, min_length=1, max_length=4096)
    email_sender_name: str | None = Field(default=None, max_length=120)
    email_sender_email: str | None = Field(default=None, max_length=254)
    clear_sms_api_key: bool = False
    clear_email_api_key: bool = False

    @field_validator("sms_api_key", "email_api_key")
    @classmethod
    def normalize_api_key(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("API keys cannot be blank.")
        return normalized

    @model_validator(mode="after")
    def validate_key_actions(self) -> "AdminIntegrationSettingsInput":
        if self.sms_api_key is not None and self.clear_sms_api_key:
            raise ValueError("Provide an SMS API key or clear it, not both.")
        if self.email_api_key is not None and self.clear_email_api_key:
            raise ValueError("Provide an email API key or clear it, not both.")
        return self

    @field_validator("email_sender_name", "email_sender_email")
    @classmethod
    def normalize_sender_fields(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("email_sender_email")
    @classmethod
    def validate_sender_email(cls, value: str | None) -> str | None:
        if value and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid verified Brevo sender email.")
        return value

    @field_validator("sms_account_sid")
    @classmethod
    def validate_twilio_account_sid(cls, value: str | None) -> str | None:
        normalized = value.strip() if value is not None else None
        if normalized and not re.fullmatch(r"AC[0-9a-fA-F]{32}", normalized):
            raise ValueError("Enter a valid Twilio Account SID beginning with AC.")
        return normalized

    @field_validator("sms_sender_phone")
    @classmethod
    def validate_twilio_sender_phone(cls, value: str | None) -> str | None:
        normalized = value.strip() if value is not None else None
        if normalized and not re.fullmatch(r"\+[1-9]\d{7,14}", normalized):
            raise ValueError("Enter a Twilio sender phone number in E.164 format, such as +14155550123.")
        return normalized


class RevealIntegrationKeyInput(BaseModel):
    channel: Literal["sms", "email"]


def _integration_settings_response(row: Any) -> dict[str, Any]:
    return {
        "sms_enabled": bool(row["sms_enabled"]),
        "email_enabled": bool(row["email_enabled"]),
        "sms_api_key_configured": bool(
            row["sms_api_key_encrypted"]
            and row["sms_account_sid_encrypted"]
        ),
        "email_api_key_configured": bool(row["email_api_key_encrypted"]),
        "email_sender_name": row["email_sender_name"] or "",
        "email_sender_email": row["email_sender_email"] or "",
    }


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


@router.get("/integration-settings", dependencies=[Depends(require_admin)])
async def get_admin_integration_settings(
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(
        select(admin_integration_settings_table).limit(1)
    )
    row = result.mappings().first()
    if row is None:
        raise HTTPException(
            status_code=503,
            detail="Integration settings are not initialized. Apply the latest database migration.",
        )
    return _integration_settings_response(row)


@router.post("/integration-settings/reveal", dependencies=[Depends(require_admin)])
async def reveal_admin_integration_key(
    payload: RevealIntegrationKeyInput,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    result = await db.execute(
        select(admin_integration_settings_table).limit(1)
    )
    settings = result.mappings().first()
    if settings is None:
        raise HTTPException(
            status_code=503,
            detail="Integration settings are not initialized. Apply the latest database migration.",
        )

    encrypted_key = settings[f"{payload.channel}_api_key_encrypted"]
    if not encrypted_key:
        raise HTTPException(status_code=404, detail="No API key is configured for this integration.")
    try:
        api_key = decrypt_integration_secret(encrypted_key)
        if payload.channel == "sms":
            encrypted_account_sid = settings["sms_account_sid_encrypted"]
            if not encrypted_account_sid:
                raise HTTPException(
                    status_code=404,
                    detail="Twilio account details are not fully configured.",
                )
            account_sid = decrypt_integration_secret(encrypted_account_sid)
    except (InvalidToken, UnicodeError) as exc:
        raise HTTPException(
            status_code=503,
            detail="The saved API key could not be decrypted. Check that ADMIN_TOKEN_SECRET has not changed.",
        ) from exc

    response.headers["Cache-Control"] = "no-store, private"
    response.headers["Pragma"] = "no-cache"
    if payload.channel == "sms":
        return {
            "account_sid": account_sid,
            "api_key": api_key,
            "sender_phone": settings["sms_sender_phone"] or "",
        }
    return {"api_key": api_key}


@router.put("/integration-settings", dependencies=[Depends(require_admin)])
async def update_admin_integration_settings(
    payload: AdminIntegrationSettingsInput,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    values: dict[str, Any] = {}
    for field in ("sms_enabled", "email_enabled"):
        value = getattr(payload, field)
        if value is not None:
            values[field] = value

    if (
        payload.sms_api_key is not None
        or payload.sms_account_sid is not None
        or payload.email_api_key is not None
    ):
        cipher = integration_settings_cipher()
        if payload.sms_api_key is not None:
            values["sms_api_key_encrypted"] = cipher.encrypt(
                payload.sms_api_key.encode("utf-8")
            ).decode("ascii")
        if payload.sms_account_sid is not None:
            values["sms_account_sid_encrypted"] = cipher.encrypt(
                payload.sms_account_sid.encode("utf-8")
            ).decode("ascii")
        if payload.email_api_key is not None:
            values["email_api_key_encrypted"] = cipher.encrypt(
                payload.email_api_key.encode("utf-8")
            ).decode("ascii")
    if payload.clear_sms_api_key:
        values["sms_api_key_encrypted"] = None
        values["sms_account_sid_encrypted"] = None
        values["sms_sender_phone"] = None
    if payload.clear_email_api_key:
        values["email_api_key_encrypted"] = None
    if "sms_sender_phone" in payload.model_fields_set and not payload.clear_sms_api_key:
        values["sms_sender_phone"] = payload.sms_sender_phone or None
    for field in ("email_sender_name", "email_sender_email"):
        if field in payload.model_fields_set:
            values[field] = getattr(payload, field) or None
    values["updated_at"] = datetime.now(timezone.utc).replace(tzinfo=None)

    result = await db.execute(
        select(admin_integration_settings_table)
        .limit(1)
        .with_for_update()
    )
    row = result.mappings().first()
    if row is None:
        raise HTTPException(
            status_code=503,
            detail="Integration settings are not initialized. Apply the latest database migration.",
        )
    effective_api_key = values.get("email_api_key_encrypted") or (
        None if payload.clear_email_api_key else row["email_api_key_encrypted"]
    )
    effective_sender_name = values.get("email_sender_name", row["email_sender_name"])
    effective_sender_email = values.get("email_sender_email", row["email_sender_email"])
    effective_email_enabled = values.get("email_enabled", row["email_enabled"])
    effective_sms_credentials = (
        values.get("sms_api_key_encrypted")
        or (None if payload.clear_sms_api_key else row["sms_api_key_encrypted"]),
        values.get("sms_account_sid_encrypted")
        or (None if payload.clear_sms_api_key else row["sms_account_sid_encrypted"]),
        values.get("sms_sender_phone")
        or (None if payload.clear_sms_api_key else row["sms_sender_phone"]),
    )
    effective_sms_enabled = values.get("sms_enabled", row["sms_enabled"])
    if effective_sms_enabled and not all(effective_sms_credentials):
        raise HTTPException(
            status_code=422,
            detail="Configure the Twilio Account SID, Auth Token, and sender phone before enabling SMS.",
        )
    if effective_email_enabled and not all(
        (effective_api_key, effective_sender_name, effective_sender_email)
    ):
        raise HTTPException(
            status_code=422,
            detail="Configure the Brevo API key, sender name, and verified sender email before enabling email.",
        )
    await db.execute(
        update(admin_integration_settings_table)
        .where(admin_integration_settings_table.c.id == row["id"])
        .values(**values)
    )
    updated = await db.execute(
        select(admin_integration_settings_table).where(
            admin_integration_settings_table.c.id == row["id"]
        )
    )
    updated_row = updated.mappings().one()
    await db.commit()
    return _integration_settings_response(updated_row)


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


def _dump_product(payload: ProductInput) -> dict[str, Any]:
    product = payload.model_dump(exclude={"variants"})
    for field in ("ingredients", "images", "categories"):
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
    quotes_by_key = {}
    if new_adjustments:
        requested = [
            OrderItemInput(
                product_id=adjustment.product_id,
                variant_id=adjustment.variant_id,
                qty=adjustment.qty,
            )
            for adjustment in new_adjustments
        ]
        try:
            quotes = await quote_order_items(db, requested)
        except CatalogValidationError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        quotes_by_key = {
            (quote.product_id, quote.variant_id): quote
            for quote in quotes
        }

    adjusted: list[dict[str, Any]] = []
    subtotal = Decimal("0")
    for adjustment in adjustments:
        key = _adjustment_line_key(adjustment)
        previous = existing.get(key)
        if previous is None:
            quote = quotes_by_key[key]
            price = quote.unit_price
            line = {
                "product_id": quote.product_id,
                "variant_id": quote.variant_id,
                "name": quote.name,
                "pack_size": quote.pack_size,
                "sku": quote.sku,
                "dish_type": quote.dish_type,
                "categories": list(quote.categories),
            }
        else:
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


async def _unique_error(db: AsyncSession, exc: IntegrityError) -> None:
    await db.rollback()
    raise HTTPException(status_code=409, detail="A product, category, SKU, or coupon with that identifier already exists.") from exc


@router.get("/products", dependencies=[Depends(require_admin)])
async def admin_products(
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    result = await db.execute(select(products_table).order_by(products_table.c.name))
    return await hydrate_products(db, [dict(row) for row in result.mappings()])


@router.post("/products", status_code=201, dependencies=[Depends(require_admin)])
async def create_product(payload: ProductInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    try:
        values = _dump_product(payload)
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
        exists = await db.execute(select(products_table.c.id).where(products_table.c.id == product_id))
        if exists.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Product not found.")
        values = _dump_product(payload)
        values["updated_at"] = datetime.now()
        await db.execute(update(products_table).where(products_table.c.id == product_id).values(**values))
        await _replace_variants(db, product_id, payload.variants)
        await db.commit()
    except IntegrityError as exc:
        await _unique_error(db, exc)
    result = await db.execute(select(products_table).where(products_table.c.id == product_id))
    return (await hydrate_products(db, [dict(result.mappings().one())]))[0]


@router.delete("/products/{product_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_product(product_id: UUID, db: AsyncSession = Depends(get_db)) -> None:
    result = await db.execute(delete(products_table).where(products_table.c.id == product_id))
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Product not found.")
    await db.commit()


@router.get("/categories", dependencies=[Depends(require_admin)])
async def admin_categories(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    result = await db.execute(select(categories_table).order_by(categories_table.c.name))
    return [dict(row) for row in result.mappings()]


@router.post("/categories", status_code=201, dependencies=[Depends(require_admin)])
async def create_category(payload: CategoryInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    try:
        result = await db.execute(insert(categories_table).values(**payload.model_dump()).returning(categories_table))
        await db.commit()
    except IntegrityError as exc:
        await _unique_error(db, exc)
    return dict(result.mappings().one())


@router.put("/categories/{category_id}", dependencies=[Depends(require_admin)])
async def update_category(category_id: UUID, payload: CategoryInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    try:
        await db.execute(update(categories_table).where(categories_table.c.id == category_id).values(**payload.model_dump()))
        await db.commit()
    except IntegrityError as exc:
        await _unique_error(db, exc)
    result = await db.execute(select(categories_table).where(categories_table.c.id == category_id))
    category = result.mappings().first()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found.")
    return dict(category)


@router.delete("/categories/{category_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_category(category_id: UUID, db: AsyncSession = Depends(get_db)) -> None:
    result = await db.execute(delete(categories_table).where(categories_table.c.id == category_id))
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Category not found.")
    await db.commit()


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
            db,
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
    statement = select(reviews_table).order_by(reviews_table.c.created_at.desc())
    if status:
        statement = statement.where(reviews_table.c.status == status)
    result = await db.execute(statement)
    return [dict(row) for row in result.mappings()]


@router.put("/reviews/{review_id}", dependencies=[Depends(require_admin)])
@router.patch("/reviews/{review_id}", dependencies=[Depends(require_admin)])
async def moderate_review(review_id: UUID, payload: ReviewStatusInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    result = await db.execute(update(reviews_table).where(reviews_table.c.id == review_id).values(status=payload.status))
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Review not found.")
    await db.commit()
    row = await db.execute(select(reviews_table).where(reviews_table.c.id == review_id))
    return dict(row.mappings().one())
