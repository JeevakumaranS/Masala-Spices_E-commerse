"""Preserve storefront cart and watchlist ordering."""

from alembic import op
import sqlalchemy as sa


revision = "20261027_guest_item_order"
down_revision = "20261026_guest_persistence"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "guest_cart_items",
        sa.Column("position", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )
    op.add_column(
        "guest_watchlist_items",
        sa.Column("position", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("guest_watchlist_items", "position")
    op.drop_column("guest_cart_items", "position")
