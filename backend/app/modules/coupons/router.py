"""Server-authoritative coupon validation routes."""

from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import coupons_table, get_db, orders_table
from app.modules.coupons.schemas import CouponValidateRequest, CouponValidationResponse
from app.modules.coupons.service import (
    CouponValidationError,
    calculate_managed_coupon,
)
from app.modules.orders.catalog import CatalogValidationError, quote_order_items

router = APIRouter(prefix="/api/coupons", tags=["coupons"])


@router.get("/active")
async def list_active_coupons(
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    response.headers["Cache-Control"] = (
        "public, max-age=0, s-maxage=30, stale-while-revalidate=30"
    )
    today = date.today()
    result = await db.execute(
        select(
            coupons_table.c.code,
            coupons_table.c.kind,
            coupons_table.c.label,
            coupons_table.c.discount_value,
            coupons_table.c.minimum_order,
            coupons_table.c.max_discount,
            coupons_table.c.starts_at,
            coupons_table.c.ends_at,
            coupons_table.c.buy_quantity,
            coupons_table.c.free_quantity,
            coupons_table.c.first_order_only,
        )
        .where(
            coupons_table.c.active.is_(True),
            or_(coupons_table.c.starts_at.is_(None), coupons_table.c.starts_at <= today),
            or_(coupons_table.c.ends_at.is_(None), coupons_table.c.ends_at >= today),
        )
        .order_by(coupons_table.c.code)
    )
    return [dict(row) for row in result.mappings()]


@router.post("/validate", response_model=CouponValidationResponse)
async def validate_coupon(
    payload: CouponValidateRequest,
    db: AsyncSession = Depends(get_db),
) -> CouponValidationResponse:
    try:
        items = await quote_order_items(db, payload.items)
    except CatalogValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    try:
        managed_result = await db.execute(
            select(coupons_table).where(coupons_table.c.code == payload.code.strip().upper())
        )
        managed = managed_result.mappings().first()
        prior_result = await db.execute(
            select(orders_table.c.phone, orders_table.c.email)
        )
        previous_orders = [dict(row) for row in prior_result.mappings()]
        if managed is not None:
            quote = calculate_managed_coupon(
                dict(managed),
                items,
                existing_orders=previous_orders,
                phone=payload.phone,
                email=payload.email,
                enforce_customer_identity=bool(payload.phone or payload.email),
                today=date.today(),
            )
        else:
            raise CouponValidationError("That promo code is not recognised.")
    except CouponValidationError as exc:
        return CouponValidationResponse(
            valid=False,
            code=payload.code.strip().upper(),
            message=str(exc),
        )

    return CouponValidationResponse(
        valid=True,
        code=quote.code,
        kind=quote.kind,
        type="percent" if quote.kind == "percentage" else quote.kind,
        label=quote.label,
        message=quote.label,
        discount=float(quote.discount),
        first_order_only=quote.first_order_only,
    )


class _LegacyItem:
    def __init__(self, subtotal: Decimal) -> None:
        self.unit_price = subtotal
        self.qty = 1
        self.name = ""
        self.dish_type = ""
        self.categories: list[str] = []


@router.get("/validate", response_model=CouponValidationResponse)
async def validate_coupon_legacy(
    code: str,
    subtotal: float = 0,
    phone: str | None = None,
    email: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> CouponValidationResponse:
    """Compatibility route for simple percentage checks from older clients."""
    try:
        managed_result = await db.execute(
            select(coupons_table).where(coupons_table.c.code == code.strip().upper())
        )
        managed = managed_result.mappings().first()
        if managed is None:
            raise CouponValidationError("That promo code is not recognised.")
        prior_result = await db.execute(
            select(orders_table.c.phone, orders_table.c.email)
        )
        quote = calculate_managed_coupon(
            dict(managed),
            [_LegacyItem(Decimal(str(max(0, subtotal))))],
            existing_orders=[dict(row) for row in prior_result.mappings()],
            phone=phone,
            email=email,
            enforce_customer_identity=bool(phone or email),
            today=date.today(),
        )
    except CouponValidationError as exc:
        return CouponValidationResponse(
            valid=False,
            code=code.strip().upper(),
            message=str(exc),
        )

    return CouponValidationResponse(
        valid=True,
        code=quote.code,
        kind=quote.kind,
        type="percent" if quote.kind == "percentage" else quote.kind,
        label=quote.label,
        message=quote.label,
        discount=float(quote.discount),
        first_order_only=quote.first_order_only,
    )
