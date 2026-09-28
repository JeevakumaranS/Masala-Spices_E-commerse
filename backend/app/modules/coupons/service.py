"""Configurable promo-code rules and server-authoritative discount calculation."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Iterable, Literal

from app.common.phone import phone_numbers_match

CouponKind = Literal["percentage", "fixed", "buy_x_get_y"]


@dataclass(frozen=True)
class CouponRule:
    code: str
    kind: CouponKind
    label: str
    minimum_order: Decimal = Decimal("0")
    percentage: int | None = None
    fixed_amount: Decimal | None = None
    max_discount: Decimal | None = None
    first_order_only: bool = False
    active_from: date | None = None
    active_until: date | None = None
    eligible_terms: tuple[str, ...] = ()
    buy_quantity: int = 0
    free_quantity: int = 0


@dataclass(frozen=True)
class CouponQuote:
    code: str
    kind: CouponKind
    label: str
    discount: Decimal
    first_order_only: bool = False


class CouponValidationError(ValueError):
    """Raised when a coupon cannot be applied to the supplied order."""


# Starter campaign data. Update/disable these records for each seasonal release.
PROMO_RULES: dict[str, CouponRule] = {
    "FIRST10": CouponRule(
        code="FIRST10",
        kind="percentage",
        label="10% off your first order (up to ₹100)",
        minimum_order=Decimal("349"),
        percentage=10,
        max_discount=Decimal("100"),
        first_order_only=True,
    ),
    "WELCOME10": CouponRule(
        code="WELCOME10",
        kind="percentage",
        label="10% off your first order (up to ₹100)",
        minimum_order=Decimal("349"),
        percentage=10,
        max_discount=Decimal("100"),
        first_order_only=True,
    ),
    "FESTIVE20": CouponRule(
        code="FESTIVE20",
        kind="percentage",
        label="20% festive discount on orders above ₹999 (up to ₹250)",
        minimum_order=Decimal("999"),
        percentage=20,
        max_discount=Decimal("250"),
        active_from=date(2026, 9, 15),
        active_until=date(2026, 10, 15),
    ),
    "BIRYANI3": CouponRule(
        code="BIRYANI3",
        kind="buy_x_get_y",
        label="Buy 2 Biryani blends, get the 3rd free",
        eligible_terms=("biryani", "biriyani"),
        buy_quantity=2,
        free_quantity=1,
    ),
}


def get_rule(code: str) -> CouponRule | None:
    normalized = (code or "").strip().upper()
    for rule in PROMO_RULES.values():
        if rule.code == normalized:
            return rule
    return None


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


def calculate_coupon(
    code: str,
    items: Iterable[Any],
    *,
    existing_orders: Iterable[dict[str, Any]] = (),
    phone: str | None = None,
    email: str | None = None,
    enforce_customer_identity: bool = False,
    today: date | None = None,
) -> CouponQuote:
    rule = get_rule(code)
    if rule is None:
        raise CouponValidationError("That promo code is not recognised.")

    current_date = today or date.today()
    if rule.active_from and current_date < rule.active_from:
        raise CouponValidationError(f"{rule.code} is not active yet.")
    if rule.active_until and current_date > rule.active_until:
        raise CouponValidationError(f"{rule.code} has ended for this season.")

    quoted_items = list(items)
    if not quoted_items:
        raise CouponValidationError("Add something to your bag before applying a promo code.")

    subtotal = _money(sum((item.unit_price * item.qty for item in quoted_items), Decimal("0")))
    if subtotal < rule.minimum_order:
        threshold = f"₹{rule.minimum_order:,.0f}"
        raise CouponValidationError(f"{rule.code} needs a minimum order value of {threshold}.")

    if rule.first_order_only:
        if enforce_customer_identity and not (phone or email):
            raise CouponValidationError("Add your phone number before applying this first-order code.")
        if _has_previous_order(existing_orders, phone, email):
            raise CouponValidationError("This first-order code has already been used with these details.")

    if rule.kind == "percentage":
        discount = subtotal * Decimal(rule.percentage or 0) / Decimal("100")
        if rule.max_discount is not None:
            discount = min(discount, rule.max_discount)
        return CouponQuote(
            code=rule.code,
            kind=rule.kind,
            label=rule.label,
            discount=_money(discount),
            first_order_only=rule.first_order_only,
        )

    if rule.kind == "fixed":
        amount = rule.fixed_amount or Decimal("0")
        return CouponQuote(
            code=rule.code,
            kind=rule.kind,
            label=rule.label,
            discount=_money(min(amount, subtotal)),
            first_order_only=rule.first_order_only,
        )

    eligible_prices: list[Decimal] = []
    for item in quoted_items:
        if _is_eligible(item, rule.eligible_terms):
            eligible_prices.extend([item.unit_price] * item.qty)
    eligible_prices.sort()

    cycle_size = rule.buy_quantity + rule.free_quantity
    if len(eligible_prices) < cycle_size:
        raise CouponValidationError(
            f"{rule.code} needs {cycle_size} eligible Biryani blends in your bag."
        )

    discount = sum(
        (price for index, price in enumerate(eligible_prices) if index % cycle_size == 0),
        Decimal("0"),
    )
    if discount <= 0:
        raise CouponValidationError("Your bag does not qualify for this offer yet.")
    return CouponQuote(
        code=rule.code,
        kind=rule.kind,
        label=rule.label,
        discount=_money(discount),
        first_order_only=rule.first_order_only,
    )


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
