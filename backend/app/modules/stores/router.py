"""Store-location routes."""

from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/store-locations", tags=["stores"])


@router.get("")
def list_store_locations() -> dict[str, list[dict[str, Any]]]:
    return {
        "items": [
            {
                "id": 1,
                "name": "Bengaluru Store",
                "address": "Koramangala, Bengaluru",
                "lat": 12.9352,
                "lng": 77.6245,
                "phone": "+91 98765 43210",
            }
        ]
    }
