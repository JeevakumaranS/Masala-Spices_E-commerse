"""Store shipment tracking details and normalize order stages.

Revision ID: 20260930_order_shipping
Revises: 20260930_order_references
"""

from alembic import op
import sqlalchemy as sa

revision = "20260930_order_shipping"
down_revision = "20260930_order_references"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("tracking_id", sa.String(length=128), nullable=True))
    op.add_column("orders", sa.Column("courier_partner", sa.String(length=120), nullable=True))
    op.execute(
        """
        UPDATE orders
        SET status = CASE
            WHEN status IN ('under_review', 'confirmed', 'packed', 'packing', 'processing')
                THEN 'processing'
            WHEN status IN ('in transit', 'in_transit', 'intransit', 'dispatched')
                THEN 'shipped'
            WHEN status IN ('complete', 'completed')
                THEN 'delivered'
            ELSE status
        END
        """
    )
    op.execute(
        """
        UPDATE order_history
        SET status = CASE
            WHEN status IN ('under_review', 'confirmed', 'packed', 'packing', 'processing')
                THEN 'processing'
            WHEN status IN ('in transit', 'in_transit', 'intransit', 'dispatched')
                THEN 'shipped'
            WHEN status IN ('complete', 'completed')
                THEN 'delivered'
            ELSE status
        END
        """
    )


def downgrade() -> None:
    op.drop_column("orders", "courier_partner")
    op.drop_column("orders", "tracking_id")
