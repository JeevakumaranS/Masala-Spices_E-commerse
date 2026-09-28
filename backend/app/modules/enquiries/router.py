"""Enquiry routes."""

from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/enquiries", tags=["enquiries"])


@router.get("")
def list_enquiries() -> dict[str, Any]:
    return {
        "items": [
            {
                "id": 1,
                "type": "bulk",
                "company_name": "Fresh Harvest Foods",
                "status": "new",
            }
        ]
    }


@router.post("")
def create_enquiry(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "queued",
        "message": "Thank you. Our sales team will contact you shortly.",
    }
