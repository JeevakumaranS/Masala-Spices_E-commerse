"""Phone normalization shared by coupon validation and order lookup."""

from __future__ import annotations

import re


def phone_digits(value: str) -> str:
    digits = re.sub(r"\D", "", value or "")
    if value.strip().startswith("00"):
        digits = digits[2:]
    return digits


def normalize_phone(value: str) -> str:
    digits = phone_digits(value)
    return f"+{digits}" if digits else ""


def normalize_indian_phone(value: str) -> str:
    digits = phone_digits(value)
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    if not re.fullmatch(r"[6-9]\d{9}", digits):
        raise ValueError("Enter a valid 10-digit Indian mobile number.")
    return f"+91{digits}"


def is_international_phone(value: str) -> bool:
    digits = phone_digits(value)
    return 8 <= len(digits) <= 15


def phone_numbers_match(left: str, right: str) -> bool:
    left_digits = phone_digits(left)
    right_digits = phone_digits(right)
    if not left_digits or not right_digits:
        return False
    if left_digits == right_digits:
        return True
    # Indian guest checkout commonly stores +91 while the customer enters the local 10-digit form.
    if len(left_digits) == 10:
        return right_digits.endswith(left_digits)
    if len(right_digits) == 10:
        return left_digits.endswith(right_digits)
    return False
