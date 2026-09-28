"""Order placement, shipping policy, and guest order lookup routes."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import String, insert, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.phone import (
    is_international_phone,
    normalize_indian_phone,
    phone_digits,
    phone_numbers_match,
)
from app.core.database import (
    coupons_table,
    get_db,
    order_history_table,
    order_items_table,
    orders_table,
)
from app.modules.coupons.service import (
    CouponValidationError,
    calculate_managed_coupon,
)
from app.modules.orders.catalog import CatalogValidationError, quote_order_items
from app.modules.orders.schemas import Order, OrderCreateRequest
from app.modules.orders.shipping import (
    INTERNATIONAL_PACKAGING_NOTE,
    calculate_shipping,
    get_international_destination,
    shipping_options_payload,
)
from app.modules.notifications.brevo import send_order_confirmation_email

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("/shipping-options")
def get_shipping_options() -> dict[str, Any]:
    return shipping_options_payload()


@router.post("", response_model=Order)
async def create_order(
    payload: OrderCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    try:
        items = await quote_order_items(db, payload.items)
    except CatalogValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    delivery_mode = payload.delivery_mode
    country_code = payload.country_code
    shipping_note: str | None = None

    if delivery_mode == "domestic":
        country_code = "IN"
        try:
            normalized_phone = normalize_indian_phone(payload.phone)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    else:
        destination = get_international_destination(country_code)
        if destination is None:
            raise HTTPException(
                status_code=422,
                detail="This destination is not currently available for Flying Abroad orders.",
            )
        if not is_international_phone(payload.phone):
            raise HTTPException(
                status_code=422,
                detail="Enter a valid international phone number including its country code.",
            )
        if not phone_digits(payload.phone).startswith(destination.calling_code.lstrip("+")):
            raise HTTPException(
                status_code=422,
                detail=f"Enter a phone number beginning with {destination.calling_code}.",
            )
        normalized_phone = payload.phone.strip()
        shipping_note = f"{destination.restriction} {INTERNATIONAL_PACKAGING_NOTE}"

    subtotal = sum((item.unit_price * item.qty for item in items), Decimal("0"))
    discount = Decimal("0")
    coupon_code: str | None = None
    coupon_label: str | None = None

    if payload.coupon_code:
        try:
            managed_result = await db.execute(
                select(coupons_table).where(coupons_table.c.code == payload.coupon_code)
            )
            managed = managed_result.mappings().first()
            prior_result = await db.execute(select(orders_table.c.id))
            previous_orders = [row[0] for row in prior_result]
            if managed is not None:
                coupon = calculate_managed_coupon(
                    dict(managed),
                    items,
                    existing_orders=previous_orders,
                    phone=payload.phone,
                    email=payload.email,
                    enforce_customer_identity=True,
                )
            else:
                raise CouponValidationError("That promo code is not recognised.")
        except CouponValidationError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        discount = coupon.discount
        coupon_code = coupon.code
        coupon_label = coupon.label

    discounted_subtotal = max(Decimal("0"), subtotal - discount)
    shipping_amount = calculate_shipping(discounted_subtotal, delivery_mode, country_code)
    total = discounted_subtotal + shipping_amount
    created_at = datetime.now(timezone.utc)

    order_sequence = (await db.execute(
        select(text("nextval('order_reference_seq')"))
    )).scalar_one()
    order_number = f"MAS-{order_sequence:05d}"

    order_id = (await db.execute(
        insert(orders_table).values(
            order_number=order_number,
            phone=normalized_phone,
            email=payload.email.strip().casefold(),
            status="placed",
            total=total,
            created_at=created_at,
            customer_name=payload.customer_name.strip(),
            payment_status="pending_offline",
            subtotal=subtotal,
            shipping_amount=shipping_amount,
            discount_amount=discount,
            coupon_code=coupon_code,
            coupon_label=coupon_label,
            delivery_mode=delivery_mode,
            country_code=country_code,
            shipping_note=shipping_note,
            item_count=sum(item.qty for item in items),
            address_line=payload.address_line.strip(),
            city=payload.city.strip(),
            state=payload.state.strip() if payload.state else None,
            postal_code=payload.postal_code.strip(),
        ).returning(orders_table.c.id)
    )).scalar_one()

    # Insert order items
    for item in items:
        await db.execute(insert(order_items_table).values(
            order_id=order_id,
            product_id=item.product_id,
            variant_id=item.variant_id,
            name=item.name,
            pack_size=item.pack_size,
            sku=item.sku,
            dish_type=item.dish_type,
            categories=list(item.categories),
            price=item.unit_price,
            qty=item.qty,
            line_total=item.unit_price * item.qty,
        ))

    # Insert order history
    await db.execute(insert(order_history_table).values(
        order_id=order_id,
        status="placed",
        changed_at=created_at,
        note="Order placed; awaiting admin confirmation.",
    ))

    await db.commit()

    order = {
        "id": order_id,
        "order_number": order_number,
        "customer_name": payload.customer_name.strip(),
        "phone": normalized_phone,
        "email": payload.email.strip().casefold(),
        "status": "placed",
        "payment_status": "pending_offline",
        "subtotal": float(subtotal),
        "shipping_amount": float(shipping_amount),
        "discount_amount": float(discount),
        "total": float(total),
        "coupon_code": coupon_code,
        "coupon_label": coupon_label,
        "delivery_mode": delivery_mode,
        "country_code": country_code,
        "shipping_note": shipping_note,
        "created_at": created_at.isoformat(),
        "item_count": sum(item.qty for item in items),
        "items": [
            {
                "product_id": item.product_id,
                "variant_id": item.variant_id,
                "name": item.name,
                "pack_size": item.pack_size,
                "sku": item.sku,
                "dish_type": item.dish_type,
                "categories": list(item.categories),
                "price": float(item.unit_price),
                "qty": item.qty,
                "line_total": float(item.unit_price * item.qty),
            }
            for item in items
        ],
        "address_line": payload.address_line.strip(),
        "city": payload.city.strip(),
        "state": payload.state.strip() if payload.state else None,
        "postal_code": payload.postal_code.strip(),
        "history": [
            {
                "id": str(uuid4()),
                "status": "placed",
                "changed_at": created_at.isoformat(),
                "note": "Order placed; awaiting admin confirmation.",
            }
        ],
    }

    order["email_confirmation_status"] = await send_order_confirmation_email(db, order)
    return order


@router.get("/{id_or_order_number}", response_model=Order)
async def get_order(id_or_order_number: str, phone: str, db: AsyncSession = Depends(get_db)) -> Order:
    normalized_reference = id_or_order_number.strip().upper()
    legacy_id_reference = (
        normalized_reference[4:].lower()
        if normalized_reference.startswith("MAS-")
        else normalized_reference.lower()
    )
    statement = select(orders_table).where(
        (orders_table.c.order_number == normalized_reference)
        | (orders_table.c.id.cast(String) == normalized_reference.lower())
        | (orders_table.c.id.cast(String) == legacy_id_reference)
    )
    result = await db.execute(statement)
    row = result.mappings().first()

    if row is None:
        raise HTTPException(status_code=404, detail="Order not found")

    order = dict(row)

    # Load order items
    items_result = await db.execute(
        select(order_items_table).where(order_items_table.c.order_id == order["id"])
    )
    order["items"] = [dict(item) for item in items_result.mappings()]

    # Load order history
    history_result = await db.execute(
        select(order_history_table)
        .where(order_history_table.c.order_id == order["id"])
        .order_by(order_history_table.c.changed_at)
    )
    order["history"] = [dict(event) for event in history_result.mappings()]

    if not phone_numbers_match(phone, str(order.get("phone") or "")):
        raise HTTPException(status_code=404, detail="Order not found")
    return Order.model_validate(order)
