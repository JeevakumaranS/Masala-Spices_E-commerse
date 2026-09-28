"""Analytics response schemas."""

from pydantic import BaseModel, Field


class AnalyticsSummary(BaseModel):
    total_revenue: float
    orders_count: int
    top_items: list[dict[str, str | int | float]]
    avg_order_value: float
    repeat_customer_rate: float = 0
    repeat_purchase_rate: float = 0
    by_category: dict[str, float] = Field(default_factory=dict)
    by_region: dict[str, float] = Field(default_factory=dict)
    by_dish_type: dict[str, float] = Field(default_factory=dict)
    sales_by_category: list[dict[str, str | float]] = Field(default_factory=list)
    sales_by_region: list[dict[str, str | float]] = Field(default_factory=list)
    sales_by_dish_type: list[dict[str, str | float]] = Field(default_factory=list)
    top_skus: list[dict[str, int | float | str]] = Field(default_factory=list)
