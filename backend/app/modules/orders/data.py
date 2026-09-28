"""In-memory order seed data used during local development.

Order placement appends to this list for the current local process. A database-backed
order repository can replace it without changing the checkout contract later.
"""

from datetime import datetime, timedelta
from typing import Any

sample_orders: list[dict[str, Any]] = [
    {
        "order_number": "MAS-1001",
        "customer_name": "Aisha Nair",
        "phone": "+919876543210",
        "email": "aisha@example.com",
        "status": "confirmed",
        "subtotal": 398,
        "shipping_amount": 40,
        "discount_amount": 20,
        "total": 418,
        "created_at": datetime.utcnow() - timedelta(days=2),
        "item_count": 2,
        "history": [
            {
                "status": "placed",
                "changed_at": datetime.utcnow() - timedelta(days=2),
                "note": "Order placed",
            },
            {
                "status": "confirmed",
                "changed_at": datetime.utcnow() - timedelta(days=1),
                "note": "Confirmed by admin",
            },
        ],
    },
]
