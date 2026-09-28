"""Domestic and international shipping policy used by checkout and orders."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from decimal import Decimal
from typing import Any, Literal

DeliveryMode = Literal["domestic", "international"]

FREE_SHIPPING_THRESHOLD = Decimal("349")
DOMESTIC_SHIPPING_FEE = Decimal("40")

INTERNATIONAL_PACKAGING_NOTE = (
    "Sealed, food-safe packaging with the product and batch details. Carton design, "
    "commercial invoices and destination paperwork are confirmed by the admin before dispatch."
)
INTERNATIONAL_CUSTOMS_NOTE = (
    "Import duties, customs clearance and destination taxes are not collected online. The admin "
    "confirms whether they apply to your destination before the order is dispatched."
)
INTERNATIONAL_PAYMENT_NOTE = (
    "Shipping is quoted in INR and arranged offline. Any duty or customs charge is confirmed "
    "with the customer before dispatch."
)


@dataclass(frozen=True)
class ShippingDestination:
    code: str
    name: str
    calling_code: str
    shipping_amount: float
    delivery_estimate: str
    restricted: bool = False
    restriction: str = INTERNATIONAL_CUSTOMS_NOTE


INTERNATIONAL_DESTINATIONS: tuple[ShippingDestination, ...] = (
    ShippingDestination("AE", "United Arab Emirates", "+971", 1299, "5–8 working days"),
    ShippingDestination("SA", "Saudi Arabia", "+966", 1299, "5–8 working days"),
    ShippingDestination("QA", "Qatar", "+974", 1299, "5–8 working days"),
    ShippingDestination("KW", "Kuwait", "+965", 1299, "5–8 working days"),
    ShippingDestination("OM", "Oman", "+968", 1299, "5–8 working days"),
    ShippingDestination("BH", "Bahrain", "+973", 1299, "5–8 working days"),
    ShippingDestination("SG", "Singapore", "+65", 1499, "5–8 working days"),
    ShippingDestination("MY", "Malaysia", "+60", 1499, "5–8 working days"),
    ShippingDestination("TH", "Thailand", "+66", 1499, "5–8 working days"),
    ShippingDestination("GB", "United Kingdom", "+44", 1699, "6–10 working days"),
    ShippingDestination("DE", "Germany", "+49", 1699, "6–10 working days"),
    ShippingDestination("FR", "France", "+33", 1699, "6–10 working days"),
    ShippingDestination("NL", "Netherlands", "+31", 1699, "6–10 working days"),
    ShippingDestination("IE", "Ireland", "+353", 1699, "6–10 working days"),
    ShippingDestination("ES", "Spain", "+34", 1699, "6–10 working days"),
    ShippingDestination("IT", "Italy", "+39", 1699, "6–10 working days"),
    ShippingDestination("US", "United States", "+1", 1899, "7–12 working days"),
    ShippingDestination("CA", "Canada", "+1", 1899, "7–12 working days"),
    ShippingDestination("AU", "Australia", "+61", 1999, "7–12 working days"),
    ShippingDestination("NZ", "New Zealand", "+64", 1999, "7–12 working days"),
    ShippingDestination("JP", "Japan", "+81", 1799, "6–10 working days"),
    ShippingDestination("KR", "South Korea", "+82", 1799, "6–10 working days"),
)

_DESTINATIONS_BY_CODE = {item.code: item for item in INTERNATIONAL_DESTINATIONS}


def get_international_destination(country_code: str) -> ShippingDestination | None:
    return _DESTINATIONS_BY_CODE.get(country_code.strip().upper())


def calculate_shipping(
    subtotal: Decimal,
    delivery_mode: DeliveryMode,
    country_code: str,
) -> Decimal:
    """Return shipping after discounts, which is the value used for thresholds."""
    if subtotal <= 0:
        return Decimal("0")
    if delivery_mode == "domestic":
        if subtotal >= FREE_SHIPPING_THRESHOLD:
            return Decimal("0")
        return DOMESTIC_SHIPPING_FEE

    destination = get_international_destination(country_code)
    if destination is None:
        raise ValueError("This destination is not currently available for Flying Abroad orders.")
    return Decimal(str(destination.shipping_amount))


def shipping_options_payload() -> dict[str, Any]:
    return {
        "currency": "INR",
        "domestic": {
            "country_code": "IN",
            "country_name": "India",
            "shipping_amount": float(DOMESTIC_SHIPPING_FEE),
            "free_shipping_threshold": float(FREE_SHIPPING_THRESHOLD),
            "delivery_estimate": "2–5 working days",
        },
        "international": {
            "destinations": [asdict(item) for item in INTERNATIONAL_DESTINATIONS],
            "packaging_note": INTERNATIONAL_PACKAGING_NOTE,
            "customs_note": INTERNATIONAL_CUSTOMS_NOTE,
            "payment_note": INTERNATIONAL_PAYMENT_NOTE,
        },
    }
