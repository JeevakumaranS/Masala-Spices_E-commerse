"""Order placement, shipping policy, and guest order lookup routes."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy import String, delete, insert, select, text
from sqlalchemy import update
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
    guest_cart_items_table,
    order_history_table,
    order_items_table,
    orders_table,
    variants_table,
)
from app.modules.coupons.service import (
    CouponValidationError,
    calculate_managed_coupon,
)
from app.modules.orders.catalog import CatalogValidationError, QuotedOrderItem, quote_order_items
from app.modules.orders.schemas import Order, OrderCreateRequest, OrderItemInput
from app.modules.orders.shipping import (
    INTERNATIONAL_PACKAGING_NOTE,
    calculate_shipping,
    get_international_destination,
    shipping_options_payload,
)
from app.modules.notifications.email import send_order_confirmation_email_background

router = APIRouter(prefix="/api/orders", tags=["orders"])


async def _deduct_order_inventory(
    db: AsyncSession,
    items: list[QuotedOrderItem],
) -> None:
    required_variant_stock: dict[Any, int] = {}
    for item in items:
        if item.variant_id is not None:
            required_variant_stock[item.variant_id] = (
                required_variant_stock.get(item.variant_id, 0) + item.qty
            )
        for variant_id, component_quantity in item.catalog_component_requirements:
            required_variant_stock[variant_id] = (
                required_variant_stock.get(variant_id, 0) + item.qty * component_quantity
            )
    for variant_id, quantity in sorted(
        required_variant_stock.items(),
        key=lambda entry: str(entry[0]),
    ):
        updated = await db.execute(
            update(variants_table)
            .where(
                variants_table.c.id == variant_id,
                variants_table.c.stock_qty >= quantity,
            )
            .values(stock_qty=variants_table.c.stock_qty - quantity)
            .returning(variants_table.c.id)
        )
        if updated.scalar_one_or_none() is None:
            await db.rollback()
            raise HTTPException(
                status_code=422,
                detail="Stock changed while placing your order. Please review your bag and try again.",
            )
@router.get("/shipping-options")
def get_shipping_options() -> dict[str, Any]:
    return shipping_options_payload()


@router.post("", response_model=Order)
async def create_order(
    payload: OrderCreateRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    cart_result = await db.execute(
        select(
            guest_cart_items_table.c.product_id,
            guest_cart_items_table.c.variant_id,
            guest_cart_items_table.c.qty,
        )
        .where(guest_cart_items_table.c.guest_id == request.state.guest_id)
        .order_by(guest_cart_items_table.c.position)
    )
    cart_items = [
        OrderItemInput(
            product_id=row["product_id"],
            variant_id=row["variant_id"],
            qty=row["qty"],
        )
        for row in cart_result.mappings()
    ]
    if not cart_items:
        raise HTTPException(status_code=422, detail="Your bag is empty or could not be verified.")
    if Counter(
        (item.product_id, item.variant_id, item.qty) for item in payload.items
    ) != Counter(
        (item.product_id, item.variant_id, item.qty) for item in cart_items
    ):
        raise HTTPException(
            status_code=409,
            detail="Your bag changed. Refresh it and review your items before placing the order.",
        )

    try:
        items = await quote_order_items(db, cart_items)
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
            prior_result = await db.execute(
                select(orders_table.c.phone, orders_table.c.email)
            )
            previous_orders = [dict(row) for row in prior_result.mappings()]
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
            guest_id=request.state.guest_id,
        ).returning(orders_table.c.id)
    )).scalar_one()

    await _deduct_order_inventory(db, items)

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

    await db.execute(
        delete(guest_cart_items_table).where(
            guest_cart_items_table.c.guest_id == request.state.guest_id
        )
    )
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

    order["email_confirmation_status"] = "pending"
    background_tasks.add_task(
        send_order_confirmation_email_background,
        order_id,
    )
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
