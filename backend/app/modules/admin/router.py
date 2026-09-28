"""Admin authentication and protected catalog/order/campaign/review operations."""

from datetime import date, datetime, timezone
from decimal import Decimal
import hmac
import os
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import (
    admin_registration_state_table,
    admin_users_table,
    categories_table,
    coupons_table,
    get_db,
    orders_table,
    products_table,
    reviews_table,
    variants_table,
)
from app.modules.admin.auth import bearer, hash_password, issue_token, require_admin, verify_password
from app.modules.admin.schemas import LoginRequest, RegisterAdminRequest
from app.modules.orders.catalog import CatalogValidationError, quote_order_items
from app.modules.orders.schemas import OrderItemInput
from app.modules.orders.shipping import calculate_shipping
from app.modules.products.router import hydrate_products

router = APIRouter(prefix="/api/admin", tags=["admin"])


class VariantInput(BaseModel):
    id: int | None = None
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
    images: list[dict[str, Any]] = Field(default_factory=list)
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
    parent_id: int | None = None
    seo_title: str | None = None
    seo_description: str | None = None


class OrderLineAdjustment(BaseModel):
    product_id: int = Field(gt=0)
    variant_id: int | None = Field(default=None, ge=0)
    qty: int = Field(ge=1, le=20)
    price: Decimal | None = Field(default=None, ge=0)

    @field_validator("variant_id", mode="before")
    @classmethod
    def normalize_no_variant(cls, value: Any) -> Any:
        return None if value == 0 else value


class OrderReviewInput(BaseModel):
    status: Literal["placed", "under_review", "confirmed", "shipped"]
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
    state_result = await db.execute(
        select(admin_registration_state_table.c.bootstrap_complete).where(
            admin_registration_state_table.c.id == 1
        )
    )
    bootstrap_complete = state_result.scalar_one_or_none()
    if bootstrap_complete is None:
        raise HTTPException(status_code=503, detail="Admin registration state is not initialized.")
    count_result = await db.execute(select(admin_users_table.c.id))
    admins_exist = count_result.first() is not None
    return {
        "admins_exist": admins_exist,
        "bootstrap_enabled": not bootstrap_complete and not admins_exist and bool(
            os.getenv("ADMIN_BOOTSTRAP_SECRET")
        ),
    }


@router.post("/register", status_code=201)
async def register_admin(
    payload: RegisterAdminRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    bootstrap_registration = credentials is None
    bootstrap_secret = os.getenv("ADMIN_BOOTSTRAP_SECRET", "")
    try:
        async with db.begin():
            state_result = await db.execute(
                select(admin_registration_state_table)
                .where(admin_registration_state_table.c.id == 1)
                .with_for_update()
            )
            state = state_result.mappings().first()
            if state is None:
                raise HTTPException(
                    status_code=503,
                    detail="Admin registration state is not initialized.",
                )
            if bootstrap_registration:
                admin_result = await db.execute(select(admin_users_table.c.id).limit(1))
                if state["bootstrap_complete"] or admin_result.first() is not None:
                    raise HTTPException(
                        status_code=403,
                        detail="Bootstrap registration is closed; sign in as an admin to register another account.",
                    )
                if not bootstrap_secret:
                    raise HTTPException(
                        status_code=503,
                        detail="The first-admin bootstrap secret is not configured.",
                    )
                if not payload.bootstrap_secret or not hmac.compare_digest(
                    payload.bootstrap_secret, bootstrap_secret
                ):
                    raise HTTPException(status_code=401, detail="Invalid bootstrap secret.")
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
            if bootstrap_registration:
                await db.execute(
                    update(admin_registration_state_table)
                    .where(admin_registration_state_table.c.id == 1)
                    .values(bootstrap_complete=True)
                )
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="An admin account with that email already exists.") from exc

    response: dict[str, Any] = {
        "id": admin["id"],
        "email": admin["email"],
        "role": "admin",
    }
    if bootstrap_registration:
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


def _order_line_key(item: dict[str, Any]) -> tuple[int, int | None]:
    return int(item["product_id"]), int(item["variant_id"]) if item.get("variant_id") is not None else None


async def _rebuild_order_items(
    db: AsyncSession,
    order: dict[str, Any],
    adjustments: list[OrderLineAdjustment],
) -> tuple[list[dict[str, Any]], Decimal]:
    if not adjustments:
        raise HTTPException(status_code=422, detail="An order must contain at least one item.")

    seen: set[tuple[int, int | None]] = set()
    for adjustment in adjustments:
        key = (adjustment.product_id, adjustment.variant_id)
        if key in seen:
            raise HTTPException(status_code=422, detail="An order line item may only be included once.")
        seen.add(key)

    existing = {_order_line_key(item): item for item in order.get("items", [])}
    new_adjustments = [
        adjustment
        for adjustment in adjustments
        if (adjustment.product_id, adjustment.variant_id) not in existing
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
        key = (adjustment.product_id, adjustment.variant_id)
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
            "qty": quote.qty,
            "price": float(price),
            "line_total": float(price * quote.qty),
        })
        adjusted.append(line)
        subtotal += price * quote.qty
    return adjusted, subtotal


async def _replace_variants(db: AsyncSession, product_id: int, variants: list[VariantInput]) -> None:
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
    result = await db.execute(select(products_table).order_by(products_table.c.id))
    return await hydrate_products(db, [dict(row) for row in result.mappings()])


@router.post("/products", status_code=201, dependencies=[Depends(require_admin)])
async def create_product(payload: ProductInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    try:
        async with db.begin():
            values = _dump_product(payload)
            values["created_at"] = datetime.now()
            values["updated_at"] = datetime.now()
            product_id = (await db.execute(insert(products_table).values(**values).returning(products_table.c.id))).scalar_one()
            await _replace_variants(db, product_id, payload.variants)
    except IntegrityError as exc:
        await _unique_error(db, exc)
    result = await db.execute(select(products_table).where(products_table.c.id == product_id))
    return (await hydrate_products(db, [dict(result.mappings().one())]))[0]


@router.put("/products/{product_id}", dependencies=[Depends(require_admin)])
async def update_product(product_id: int, payload: ProductInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    try:
        async with db.begin():
            exists = await db.execute(select(products_table.c.id).where(products_table.c.id == product_id))
            if exists.scalar_one_or_none() is None:
                raise HTTPException(status_code=404, detail="Product not found.")
            values = _dump_product(payload)
            values["updated_at"] = datetime.now()
            await db.execute(update(products_table).where(products_table.c.id == product_id).values(**values))
            await _replace_variants(db, product_id, payload.variants)
    except IntegrityError as exc:
        await _unique_error(db, exc)
    result = await db.execute(select(products_table).where(products_table.c.id == product_id))
    return (await hydrate_products(db, [dict(result.mappings().one())]))[0]


@router.delete("/products/{product_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)) -> None:
    result = await db.execute(delete(products_table).where(products_table.c.id == product_id))
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Product not found.")
    await db.commit()


@router.get("/categories", dependencies=[Depends(require_admin)])
async def admin_categories(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    result = await db.execute(select(categories_table).order_by(categories_table.c.id))
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
async def update_category(category_id: int, payload: CategoryInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
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
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)) -> None:
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
    return [dict(row["order_data"]) for row in result.mappings()]


@router.put("/orders/{order_id}", dependencies=[Depends(require_admin)])
@router.patch("/orders/{order_id}", dependencies=[Depends(require_admin)])
async def review_order(order_id: int, payload: OrderReviewInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    allowed = {
        "placed": {"under_review"},
        "under_review": {"confirmed"},
        "confirmed": {"shipped"},
        "shipped": set(),
    }
    async with db.begin():
        result = await db.execute(select(orders_table).where(orders_table.c.id == order_id).with_for_update())
        row = result.mappings().first()
        if row is None:
            raise HTTPException(status_code=404, detail="Order not found.")
        order = dict(row["order_data"])
        current = str(order["status"])
        if payload.status != current and payload.status not in allowed.get(current, set()):
            raise HTTPException(status_code=409, detail=f"Invalid order transition: {current} to {payload.status}.")
        if current == "under_review" and payload.status == "confirmed":
            contact_note = (payload.admin_note or payload.note or "").strip()
            payment_note = (payload.payment_note or "").strip()
            if not contact_note:
                raise HTTPException(
                    status_code=422,
                    detail="Record the customer contact outcome before confirming this order.",
                )
            if order.get("payment_status") == "pending_offline" and not payment_note:
                raise HTTPException(
                    status_code=422,
                    detail="Record the offline payment arrangement before confirming this order.",
                )
        if payload.items is not None:
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
        previous = order["status"]
        order["status"] = payload.status
        history = order.setdefault("history", [])
        history.append({
            "id": max((int(event.get("id", 0)) for event in history), default=0) + 1,
            "status": payload.status,
            "changed_at": datetime.now(timezone.utc).isoformat(),
            "note": payload.note or (f"Status changed from {previous} to {payload.status}." if previous != payload.status else "Order details updated."),
        })
        note = payload.note if payload.note is not None else payload.admin_note
        if payload.admin_note is not None:
            order["admin_note"] = payload.admin_note
        if payload.payment_note is not None:
            order["payment_note"] = payload.payment_note
        elif note and ("offline" in note.casefold() or "payment" in note.casefold()):
            order["payment_note"] = note
        if note:
            order["admin_note"] = note
            order.setdefault("admin_notes", []).append({
                "note": note,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        await db.execute(update(orders_table).where(orders_table.c.id == order_id).values(
            status=payload.status, total=order["total"], order_data=order
        ))
    return order


@router.get("/coupons", dependencies=[Depends(require_admin)])
async def admin_coupons(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    result = await db.execute(select(coupons_table).order_by(coupons_table.c.id))
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
async def update_coupon(coupon_id: int, payload: CouponInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
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
async def delete_coupon(coupon_id: str, db: AsyncSession = Depends(get_db)) -> None:
    try:
        identifier = int(coupon_id)
    except ValueError:
        result = await db.execute(delete(coupons_table).where(
            coupons_table.c.code == coupon_id.strip().upper()
        ))
    else:
        result = await db.execute(delete(coupons_table).where(coupons_table.c.id == identifier))
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


@router.patch("/reviews/{review_id}", dependencies=[Depends(require_admin)])
async def moderate_review(review_id: int, payload: ReviewStatusInput, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    result = await db.execute(update(reviews_table).where(reviews_table.c.id == review_id).values(status=payload.status))
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Review not found.")
    await db.commit()
    row = await db.execute(select(reviews_table).where(reviews_table.c.id == review_id))
    return dict(row.mappings().one())
