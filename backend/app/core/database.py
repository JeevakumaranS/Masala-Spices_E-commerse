"""Async SQLAlchemy database access."""

import os
from collections.abc import AsyncIterator

from dotenv import load_dotenv
from sqlalchemy import JSON, Boolean, Column, Date, DateTime, Integer, MetaData, Numeric, String, Table, Text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/masala_db",
)

engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
session_factory = async_sessionmaker(engine, expire_on_commit=False)
metadata = MetaData()

categories_table = Table(
    "categories",
    metadata,
    Column("id", Integer),
    Column("name", String),
    Column("slug", String),
    Column("type", String),
    Column("description", Text),
    Column("parent_id", Integer),
    Column("seo_title", String),
    Column("seo_description", Text),
    Column("created_at", DateTime),
)
products_table = Table(
    "products",
    metadata,
    Column("id", Integer),
    Column("name", String),
    Column("slug", String),
    Column("description", Text),
    Column("ingredients", JSON),
    Column("price", Numeric),
    Column("mrp", Numeric),
    Column("discount_pct", Integer),
    Column("spice_level", String),
    Column("status", String),
    Column("categories", JSON),
    Column("images", JSON),
    Column("dish_type", String),
    Column("is_veg", Boolean),
    Column("contains_ginger_garlic", Boolean),
    Column("contains_tamarind", Boolean),
    Column("created_at", DateTime),
    Column("updated_at", DateTime),
)
variants_table = Table(
    "product_variants",
    metadata,
    Column("id", Integer),
    Column("product_id", Integer),
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
    Column("id", Integer, primary_key=True),
    Column("email", String),
    Column("password_hash", String),
    Column("is_active", Boolean),
    Column("created_at", DateTime),
)
admin_registration_state_table = Table(
    "admin_registration_state",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("bootstrap_complete", Boolean),
)

orders_table = Table(
    "orders",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("order_number", String),
    Column("phone", String),
    Column("email", String),
    Column("status", String),
    Column("total", Numeric),
    Column("created_at", DateTime),
    Column("order_data", JSON),
)
coupons_table = Table(
    "coupons",
    metadata,
    Column("id", Integer, primary_key=True),
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
    Column("eligible_terms", JSON),
    Column("first_order_only", Boolean),
)
reviews_table = Table(
    "product_reviews",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("product_id", Integer),
    Column("reviewer_name", String),
    Column("rating", Integer),
    Column("comment", Text),
    Column("status", String),
    Column("created_at", DateTime),
)
recipes_table = Table(
    "recipes",
    metadata,
    Column("id", Integer),
    Column("title", String),
    Column("slug", String),
    Column("cook_time_minutes", Integer),
    Column("cuisine", String),
    Column("dish_type", String),
    Column("ingredients", JSON),
    Column("steps", JSON),
    Column("hero_image_url", Text),
    Column("video_url", Text),
)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        yield session
