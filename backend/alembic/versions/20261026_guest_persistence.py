"""Persist anonymous guest carts and watchlists."""

from alembic import op
import sqlalchemy as sa


revision = "20261026_guest_persistence"
down_revision = "20261025_plain_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "guest_sessions",
        sa.Column("guest_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("guest_id"),
    )
    op.create_index(
        "ix_guest_sessions_last_seen_at",
        "guest_sessions",
        ["last_seen_at"],
    )
    op.create_table(
        "guest_cart_items",
        sa.Column("guest_id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("variant_key", sa.Uuid(), nullable=False),
        sa.Column("variant_id", sa.Uuid(), nullable=True),
        sa.Column("is_combo", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.ForeignKeyConstraint(
            ["guest_id"],
            ["guest_sessions.guest_id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("guest_id", "product_id", "variant_key"),
        sa.CheckConstraint("qty BETWEEN 1 AND 20", name="ck_guest_cart_items_qty"),
    )
    op.create_table(
        "guest_watchlist_items",
        sa.Column("guest_id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.ForeignKeyConstraint(
            ["guest_id"],
            ["guest_sessions.guest_id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("guest_id", "product_id"),
    )
    op.add_column("orders", sa.Column("guest_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_orders_guest_id_guest_sessions",
        "orders",
        "guest_sessions",
        ["guest_id"],
        ["guest_id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_orders_guest_id", "orders", ["guest_id"])


def downgrade() -> None:
    op.drop_index("ix_orders_guest_id", table_name="orders")
    op.drop_constraint("fk_orders_guest_id_guest_sessions", "orders", type_="foreignkey")
    op.drop_column("orders", "guest_id")
    op.drop_table("guest_watchlist_items")
    op.drop_table("guest_cart_items")
    op.drop_index("ix_guest_sessions_last_seen_at", table_name="guest_sessions")
    op.drop_table("guest_sessions")
