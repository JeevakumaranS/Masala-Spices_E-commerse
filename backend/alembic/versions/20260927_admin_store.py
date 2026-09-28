"""Persist admin-managed commerce data and orders."""

from alembic import op
import sqlalchemy as sa

revision = "20260927_admin_store"
down_revision = "20260925_catalog_facets"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_number", sa.String(40), nullable=False, unique=True),
        sa.Column("phone", sa.String(32), nullable=False),
        sa.Column("email", sa.String(254), nullable=True),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("total", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("order_data", sa.JSON(), nullable=False),
    )
    op.create_index("ix_orders_phone", "orders", ["phone"])
    op.create_index("ix_orders_email", "orders", ["email"])
    op.create_table(
        "coupons",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(40), nullable=False, unique=True),
        sa.Column("kind", sa.String(24), nullable=False),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("discount_value", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("minimum_order", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("max_discount", sa.Numeric(12, 2), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("starts_at", sa.Date(), nullable=True),
        sa.Column("ends_at", sa.Date(), nullable=True),
        sa.Column("buy_quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("free_quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("eligible_terms", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("first_order_only", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.execute(
        sa.text(
            """
            INSERT INTO coupons
                (code, kind, label, discount_value, minimum_order, max_discount,
                 active, starts_at, ends_at, buy_quantity, free_quantity,
                 eligible_terms, first_order_only)
            VALUES
                ('FIRST10', 'percentage', '10% off your first order (up to ₹100)',
                 10, 349, 100, true, NULL, NULL, 0, 0, '[]'::json, true),
                ('WELCOME10', 'percentage', '10% off your first order (up to ₹100)',
                 10, 349, 100, true, NULL, NULL, 0, 0, '[]'::json, true),
                ('FESTIVE20', 'percentage', '20% festive discount on orders above ₹999 (up to ₹250)',
                 20, 999, 250, true, DATE '2026-09-15', DATE '2026-10-15', 0, 0, '[]'::json, false),
                ('BIRYANI3', 'buy_x_get_y', 'Buy 2 Biryani blends, get the 3rd free',
                 0, 0, NULL, true, NULL, NULL, 2, 1, '["biryani", "biriyani"]'::json, false)
            ON CONFLICT (code) DO NOTHING
            """
        )
    )
    op.create_table(
        "product_reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reviewer_name", sa.String(120), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_product_reviews_product_id", "product_reviews", ["product_id"])


def downgrade() -> None:
    op.drop_index("ix_product_reviews_product_id", table_name="product_reviews")
    op.drop_table("product_reviews")
    op.drop_table("coupons")
    op.drop_index("ix_orders_email", table_name="orders")
    op.drop_index("ix_orders_phone", table_name="orders")
    op.drop_table("orders")
