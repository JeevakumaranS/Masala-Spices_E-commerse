"""Async SQLAlchemy database access."""

import os
import secrets
import time
from collections.abc import AsyncIterator
from uuid import UUID

from dotenv import load_dotenv
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    Numeric,
    String,
    Table,
    Text,
    UniqueConstraint,
    Uuid,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/masala_db",
)

engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
session_factory = async_sessionmaker(engine, expire_on_commit=False)
metadata = MetaData()


def _uuid7_default() -> UUID:
    random_bits = secrets.randbits(74)
    timestamp_ms = time.time_ns() // 1_000_000
    value = (
        ((timestamp_ms & ((1 << 48) - 1)) << 80)
        | (0x7 << 76)
        | (((random_bits >> 62) & 0xFFF) << 64)
        | (0b10 << 62)
        | (random_bits & ((1 << 62) - 1))
    )
    return UUID(int=value)


categories_table = Table(
    "categories",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default),
    Column("name", String),
    Column("slug", String),
    Column("type", String),
    Column("description", Text),
    Column("parent_id", Uuid, ForeignKey("categories.id")),
    Column("seo_title", String),
    Column("seo_description", Text),
    Column("created_at", DateTime),
)
products_table = Table(
    "products",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default),
    Column("name", String),
    Column("slug", String),
    Column("description", Text),
    Column("ingredients", ARRAY(String)),
    Column("price", Numeric),
    Column("mrp", Numeric),
    Column("discount_pct", Integer),
    Column("spice_level", String),
    Column("status", String),
    Column("categories", ARRAY(String)),
    Column("images", ARRAY(String)),
    Column("dish_type", String),
    Column("is_veg", Boolean),
    Column("created_at", DateTime),
    Column("updated_at", DateTime),
)
combos_table = Table(
    "combos",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default),
    Column("name", String),
    Column("slug", String),
    Column("description", Text),
    Column("price", Numeric),
    Column("mrp", Numeric),
    Column("discount_pct", Integer),
    Column("spice_level", String),
    Column("status", String),
    Column("categories", ARRAY(String)),
    Column("images", ARRAY(String)),
    Column("dish_type", String),
    Column("is_veg", Boolean),
    Column("created_at", DateTime),
    Column("updated_at", DateTime),
)
variants_table = Table(
    "product_variants",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default),
    Column("product_id", Uuid, ForeignKey("products.id", ondelete="CASCADE")),
    Column("pack_size", String),
    Column("price", Numeric),
    Column("mrp", Numeric),
    Column("stock_qty", Integer),
    Column("expiry_date", Date),
    Column("sku", String),
    Column("batch_no", String),
)
combo_catalog_products_table = Table(
    "combo_catalog_products",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default),
    Column("combo_id", Uuid, ForeignKey("combos.id", ondelete="CASCADE"), nullable=False),
    Column("product_id", Uuid, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False),
    Column("variant_id", Uuid, ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=False),
    Column("quantity", Integer, nullable=False),
    Column("sort_order", Integer, nullable=False, default=0),
    UniqueConstraint("combo_id", "variant_id", name="uq_combo_catalog_variant"),
)
admin_users_table = Table(
    "admin_users",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default),
    Column("email", String),
    Column("password_hash", String),
    Column("is_active", Boolean),
    Column("created_at", DateTime(timezone=True)),
)
notification_settings_table = Table(
    "notification_settings",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default),
    Column("sms_enabled", Boolean),
    Column("email_enabled", Boolean),
    Column("sms_api_key", Text),
    Column("sms_account_sid", Text),
    Column("sms_sender_phone", String),
    Column("email_api_key", Text),
    Column("email_sender_name", String),
    Column("email_sender_email", String),
    Column("updated_at", DateTime),
)
hero_images_table = Table(
    "hero_images",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default),
    Column("object_key", String, nullable=False, unique=True),
    Column("alt_text", Text, nullable=False, default=""),
    Column("sort_order", Integer, nullable=False, default=0),
    Column("created_at", DateTime(timezone=True), nullable=False),
)
updates_table = Table(
    "updates",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default),
    Column("email", String(254), nullable=False, unique=True),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("confirmation_sent_at", DateTime(timezone=True)),
)
homepage_settings_table = Table(
    "homepage_settings",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default, server_default=text("uuidv7()")),
    Column("content", JSON, nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
)
orders_table = Table(
    "orders",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default),
    Column("order_number", String),
    Column("phone", String),
    Column("email", String),
    Column("status", String),
    Column("total", Numeric),
    Column("created_at", DateTime(timezone=True)),
    Column("customer_name", String),
    Column("payment_status", String),
    Column("subtotal", Numeric),
    Column("shipping_amount", Numeric),
    Column("discount_amount", Numeric),
    Column("coupon_code", String),
    Column("coupon_label", String),
    Column("delivery_mode", String),
    Column("country_code", String),
    Column("shipping_note", Text),
    Column("item_count", Integer),
    Column("address_line", Text),
    Column("city", String),
    Column("state", String),
    Column("postal_code", String),
    Column("admin_note", Text),
    Column("payment_note", Text),
    Column("tracking_id", String),
    Column("courier_partner", String),
)
order_items_table = Table(
    "order_items",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default),
    Column("order_id", Uuid, ForeignKey("orders.id", ondelete="CASCADE")),
    Column("product_id", Uuid),
    Column("variant_id", Uuid),
    Column("name", String),
    Column("pack_size", String),
    Column("sku", String),
    Column("dish_type", String),
    Column("categories", ARRAY(String)),
    Column("price", Numeric),
    Column("qty", Integer),
    Column("line_total", Numeric),
)
order_history_table = Table(
    "order_history",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default),
    Column("order_id", Uuid, ForeignKey("orders.id", ondelete="CASCADE")),
    Column("status", String),
    Column("changed_at", DateTime(timezone=True)),
    Column("note", Text),
)
coupons_table = Table(
    "coupons",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default),
    Column("code", String),
    Column("kind", String),
    Column("label", String),
    Column("discount_value", Numeric),
    Column("minimum_order", Numeric),
    Column("max_discount", Numeric),
    Column("active", Boolean),
    Column("starts_at", Date),
    Column("ends_at", Date),
    Column("buy_quantity", Integer),
    Column("free_quantity", Integer),
    Column("eligible_terms", ARRAY(String)),
    Column("first_order_only", Boolean),
)
reviews_table = Table(
    "product_reviews",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default),
    Column("product_id", Uuid, ForeignKey("products.id", ondelete="CASCADE")),
    Column("combo_id", Uuid, ForeignKey("combos.id", ondelete="CASCADE")),
    Column("reviewer_name", String),
    Column("rating", Integer),
    Column("comment", Text),
    Column("status", String),
    Column("created_at", DateTime),
)
recipes_table = Table(
    "recipes",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default),
    Column("title", String),
    Column("slug", String),
    Column("cook_time_minutes", Integer),
    Column("cuisine", String),
    Column("dish_type", String),
    Column("ingredients", ARRAY(String)),
    Column("steps", ARRAY(String)),
    Column("hero_image_url", Text),
    Column("video_url", Text),
)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        yield session
