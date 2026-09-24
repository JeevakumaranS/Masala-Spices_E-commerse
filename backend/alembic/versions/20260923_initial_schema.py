"""Initial schema for Masala storefront

Revision ID: 20260923_initial
Revises: 
Create Date: 2026-09-23
"""

from alembic import op
import sqlalchemy as sa

revision = "20260923_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False, unique=True),
        sa.Column("type", sa.String(length=32), nullable=False, server_default="product_type"),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("seo_title", sa.String(length=255), nullable=True),
        sa.Column("seo_description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("ingredients", sa.JSON(), nullable=True),
        sa.Column("net_weight_options", sa.JSON(), nullable=True),
        sa.Column("shelf_life", sa.String(length=120), nullable=True),
        sa.Column("spice_level", sa.String(length=32), nullable=False, server_default="mild"),
        sa.Column("is_all_in_one", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("contains_ginger_garlic", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("contains_tamarind", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("fssai_license_no", sa.String(length=120), nullable=True),
        sa.Column("allergen_info", sa.Text(), nullable=True),
        sa.Column("mrp", sa.Numeric(precision=10, scale=2), nullable=False, server_default="0"),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False, server_default="0"),
        sa.Column("discount_pct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    op.create_table(
        "product_variants",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pack_size", sa.String(length=32), nullable=False),
        sa.Column("kit_type", sa.String(length=32), nullable=True),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("mrp", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("stock_qty", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("batch_no", sa.String(length=64), nullable=True),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        sa.Column("sku", sa.String(length=64), nullable=False, unique=True),
    )

    op.create_index("ix_categories_slug", "categories", ["slug"], unique=True)
    op.create_index("ix_products_slug", "products", ["slug"], unique=True)
    op.create_index("ix_product_variants_product_id", "product_variants", ["product_id"])


def downgrade() -> None:
    op.drop_index("ix_product_variants_product_id", table_name="product_variants")
    op.drop_index("ix_products_slug", table_name="products")
    op.drop_index("ix_categories_slug", table_name="categories")
    op.drop_table("product_variants")
    op.drop_table("products")
    op.drop_table("categories")
