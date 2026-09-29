"""Database-managed promo-code validation and server-authoritative discounts."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Iterable, Literal

from app.common.phone import phone_numbers_match

CouponKind = Literal["percentage", "fixed", "buy_x_get_y"]


@dataclass(frozen=True)
class CouponQuote:
    code: str
    kind: CouponKind
    label: str
    discount: Decimal
    first_order_only: bool = False


class CouponValidationError(ValueError):
    """Raised when a coupon cannot be applied to the supplied order."""


def _has_previous_order(
    orders: Iterable[dict[str, Any]],
    phone: str | None,
    email: str | None,
) -> bool:
    normalized_email = (email or "").strip().casefold()
    for order in orders:
        if phone and phone_numbers_match(phone, str(order.get("phone") or "")):
            return True
        order_email = str(order.get("email") or "").strip().casefold()
        if normalized_email and order_email and order_email == normalized_email:
            return True
    return False


def _is_eligible(item: Any, terms: tuple[str, ...]) -> bool:
    haystack = " ".join(
        str(value or "")
        for value in (
            getattr(item, "name", ""),
            getattr(item, "dish_type", ""),
            " ".join(getattr(item, "categories", []) or []),
        )
    ).casefold()
    return any(term.casefold() in haystack for term in terms)


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_managed_coupon(
    coupon: dict[str, Any],
    items: Iterable[Any],
    *,
    existing_orders: Iterable[dict[str, Any]] = (),
    phone: str | None = None,
    email: str | None = None,
    enforce_customer_identity: bool = False,
    today: date | None = None,
) -> CouponQuote:
    """Calculate an admin-managed coupon using the server-side item quote."""
    code = str(coupon["code"]).strip().upper()
    if not coupon.get("active"):
        raise CouponValidationError("That promo code is not currently active.")
    current_date = today or date.today()
    if coupon.get("starts_at") and current_date < coupon["starts_at"]:
        raise CouponValidationError(f"{code} is not active yet.")
    if coupon.get("ends_at") and current_date > coupon["ends_at"]:
        raise CouponValidationError(f"{code} has ended.")
    quoted_items = list(items)
    subtotal = _money(sum((item.unit_price * item.qty for item in quoted_items), Decimal("0")))
    minimum = Decimal(str(coupon.get("minimum_order") or 0))
    if subtotal < minimum:
        raise CouponValidationError(f"{code} needs a minimum order value of ₹{minimum:,.0f}.")
    first_order_only = bool(coupon.get("first_order_only", False))
    if first_order_only:
        if enforce_customer_identity and not (phone or email):
            raise CouponValidationError("Add your phone number before applying this first-order code.")
        if _has_previous_order(existing_orders, phone, email):
            raise CouponValidationError("This first-order code has already been used with these details.")

    kind = str(coupon["kind"])
    if kind in ("percentage", "fixed"):
        value = Decimal(str(coupon.get("discount_value") or 0))
        discount = subtotal * value / Decimal("100") if kind == "percentage" else value
        maximum = coupon.get("max_discount")
        if maximum is not None:
            discount = min(discount, Decimal(str(maximum)))
        discount = min(subtotal, discount)
    elif kind in ("buy_x_get_y", "combo"):
        terms = tuple(str(term) for term in coupon.get("eligible_terms") or ())
        buy = int(coupon.get("buy_quantity") or 0)
        free = int(coupon.get("free_quantity") or 0)
        if buy < 1 or free < 1 or not terms:
            raise CouponValidationError("This offer is not configured correctly.")
        prices: list[Decimal] = []
        for item in quoted_items:
            if _is_eligible(item, terms):
                prices.extend([item.unit_price] * item.qty)
        prices.sort()
        cycle = buy + free
        if len(prices) < cycle:
            raise CouponValidationError(f"{code} needs {cycle} eligible items in your bag.")
        discount = sum(
            (price for index, price in enumerate(prices) if index % cycle < free),
            Decimal("0"),
        )
    else:
        raise CouponValidationError("This promo code has an unsupported offer type.")
    return CouponQuote(
        code=code,
        kind="buy_x_get_y" if kind == "combo" else kind,
        label=str(coupon["label"]),
        discount=_money(discount),
        first_order_only=first_order_only,
    )
