"""Database-backed admin analytics."""

from collections import Counter
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.phone import phone_digits
from app.core.database import get_db, orders_table
from app.modules.admin.auth import require_admin
from app.modules.analytics.schemas import AnalyticsSummary

router = APIRouter(prefix="/api/analytics", tags=["analytics"])
admin_router = APIRouter(prefix="/api/admin/analytics", tags=["admin", "analytics"])


@router.get("/summary", response_model=AnalyticsSummary, dependencies=[Depends(require_admin)])
@admin_router.get("/summary", response_model=AnalyticsSummary, dependencies=[Depends(require_admin)])
async def analytics_summary(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    result = await db.execute(select(orders_table.c.order_data))
    orders = [row[0] for row in result]
    accepted = [order for order in orders if order.get("status") in {"confirmed", "shipped"}]
    total_revenue = sum(float(order.get("total") or 0) for order in accepted)
    customer_keys = []
    for order in orders:
        phone = phone_digits(str(order.get("phone") or ""))
        email = str(order.get("email") or "").strip().casefold()
        identity = f"phone:{phone}" if phone else f"email:{email}" if email else ""
        if identity:
            customer_keys.append(identity)
    customer_order_counts = Counter(customer_keys)
    repeat_customer_rate = (
        sum(count > 1 for count in customer_order_counts.values()) / len(customer_order_counts)
        if customer_order_counts
        else 0
    )
    category_revenue: Counter[str] = Counter()
    region_revenue: Counter[str] = Counter()
    dish_revenue: Counter[str] = Counter()
    sku_quantity: Counter[str] = Counter()
    sku_revenue: Counter[str] = Counter()
    item_quantity: Counter[str] = Counter()
    item_revenue: Counter[str] = Counter()
    for order in orders:
        region = str(order.get("state") or order.get("city") or "Unknown")
        order_items = order.get("items", [])
        gross_items = sum(
            float(item.get("line_total") or float(item.get("price") or 0) * int(item.get("qty") or 0))
            for item in order_items
        )
        for item in order.get("items", []):
            count = int(item.get("qty") or 0)
            line_revenue = float(
                item.get("line_total") or float(item.get("price") or 0) * count
            )
            if gross_items > 0:
                region_revenue[region] += line_revenue
            for category in item.get("categories") or []:
                category_revenue[str(category)] += line_revenue
            dish = item.get("dish_type")
            if dish:
                dish_revenue[str(dish)] += line_revenue
            sku = str(item.get("sku") or item.get("name") or "Unknown")
            name = str(item.get("name") or sku)
            sku_quantity[sku] += count
            sku_revenue[sku] += line_revenue
            item_quantity[name] += count
            item_revenue[name] += line_revenue
    by_category = dict(category_revenue)
    by_region = dict(region_revenue)
    by_dish = dict(dish_revenue)
    return {
        "total_revenue": total_revenue,
        "orders_count": len(orders),
        "top_items": [
            {
                "name": name,
                "quantity": quantity,
                "revenue": item_revenue[name],
            }
            for name, quantity in item_quantity.most_common(5)
        ],
        "avg_order_value": total_revenue / len(accepted) if accepted else 0,
        "repeat_customer_rate": repeat_customer_rate,
        "repeat_purchase_rate": repeat_customer_rate,
        "by_category": dict(by_category),
        "by_region": dict(by_region),
        "by_dish_type": dict(by_dish),
        "sales_by_category": [{"name": name, "revenue": revenue} for name, revenue in category_revenue.most_common()],
        "sales_by_region": [{"name": name, "revenue": revenue} for name, revenue in region_revenue.most_common()],
        "sales_by_dish_type": [{"name": name, "revenue": revenue} for name, revenue in dish_revenue.most_common()],
        "top_skus": [
            {"sku": sku, "quantity": quantity, "revenue": sku_revenue[sku]}
            for sku, quantity in sku_quantity.most_common(10)
        ],
    }
