"""Async SQLAlchemy database access."""

import os
import secrets
import time
from collections.abc import AsyncIterator
from pathlib import Path
from uuid import UUID

from dotenv import load_dotenv
from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Enum as SAEnum,
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
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.modules.enquiries.schemas import MessageStatus

_repository_root = Path(__file__).resolve().parents[3]
load_dotenv(_repository_root / ".env", override=False)
load_dotenv(_repository_root / "backend" / ".env", override=False)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL must be configured in the backend environment.")

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
    Column("image_key", String),
    Column("created_at", DateTime),
)
products_table = Table(
    "products",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default),
    Column("name", String),
    Column("slug", String),
    Column("description", Text),
    Column("spice_level", String),
    Column("status", String),
    Column("categories", ARRAY(String)),
    Column("images", ARRAY(String)),
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
    Column("catalog_products", JSONB, nullable=False, server_default=text("'[]'::jsonb")),
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
admin_users_table = Table(
    "admin_users",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default),
    Column("email", String),
    Column("password_hash", String),
    Column("is_active", Boolean),
    Column("created_at", DateTime(timezone=True)),
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
notification_settings_table = Table(
    "notification_settings",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("sms_enabled", Boolean, nullable=False, server_default=text("false")),
    Column("sms_account_sid", Text),
    Column("sms_auth_token", Text),
    Column("sms_sender_phone", String(32)),
    Column("email_enabled", Boolean, nullable=False, server_default=text("false")),
    Column("email_api_key", Text),
    Column("email_sender_name", String(255)),
    Column("email_sender_email", String(320)),
    Column("google_apps_script_url", Text),
    CheckConstraint("id = 1", name="ck_notification_settings_singleton"),
)
guest_sessions_table = Table(
    "guest_sessions",
    metadata,
    Column("guest_id", Uuid, primary_key=True, default=_uuid7_default),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("last_seen_at", DateTime(timezone=True), nullable=False),
)
guest_cart_items_table = Table(
    "guest_cart_items",
    metadata,
    Column(
        "guest_id",
        Uuid,
        ForeignKey("guest_sessions.guest_id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("product_id", Uuid, primary_key=True),
    Column("variant_key", Uuid, primary_key=True),
    Column("variant_id", Uuid),
    Column("is_combo", Boolean, nullable=False, server_default=text("false")),
    Column("qty", Integer, nullable=False),
    Column("position", Integer, nullable=False, server_default=text("0")),
    CheckConstraint("qty BETWEEN 1 AND 20", name="ck_guest_cart_items_qty"),
)
guest_watchlist_items_table = Table(
    "guest_watchlist_items",
    metadata,
    Column(
        "guest_id",
        Uuid,
        ForeignKey("guest_sessions.guest_id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("product_id", Uuid, primary_key=True),
    Column("position", Integer, nullable=False, server_default=text("0")),
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
    Column("guest_id", Uuid, ForeignKey("guest_sessions.guest_id", ondelete="SET NULL")),
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
    Column("video_url", Text)
)
blog_posts_table = Table(
    "blog_posts",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default, server_default=text("uuidv7()")),
    Column("title", String(255), nullable=False),
    Column("slug", String(255), nullable=False),
    Column("category", String(120), nullable=False),
    Column("published_at", Date, nullable=False),
    Column("hero_image_url", Text, nullable=False),
    Column("body", Text, nullable=False),
    Column("status", String(20), nullable=False, default="draft", server_default="draft"),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=text("now()")),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=text("now()")),
    UniqueConstraint("slug", name="uq_blog_posts_slug"),
)
messages_table = Table(
    "messages",
    metadata,
    Column("id", Uuid, primary_key=True, default=_uuid7_default, server_default=text("uuidv7()")),
    Column("name", String(160), nullable=False),
    Column("email", String(254), nullable=False),
    Column("phone", String(24)),
    Column("subject", String(80), nullable=False),
    Column("message", Text, nullable=False),
    Column(
        "status",
        SAEnum(
            MessageStatus,
            name="message_status",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
        default=MessageStatus.NEW,
        server_default=MessageStatus.NEW.value,
    ),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=text("now()")),
)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        yield session
