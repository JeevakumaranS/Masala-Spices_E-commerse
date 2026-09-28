"""Use fixed-width numeric order references.

Revision ID: 20260930_order_references
Revises: 20260929_product_image_urls
"""

from alembic import op
import sqlalchemy as sa

revision = "20260930_order_references"
down_revision = "20260929_product_image_urls"
branch_labels = None
depends_on = None

_MAX_ORDER_REFERENCE = 99999


def upgrade() -> None:
    connection = op.get_bind()
    order_count = connection.execute(
        sa.text("SELECT count(*) FROM orders")
    ).scalar_one()
    if order_count > _MAX_ORDER_REFERENCE:
        raise RuntimeError(
            "Cannot assign five-digit order references: more than 99,999 orders exist."
        )

    op.execute(
        "CREATE SEQUENCE order_reference_seq AS integer "
        "MINVALUE 1 MAXVALUE 99999 START WITH 1 NO CYCLE"
    )
    op.execute(
        """
        WITH numbered_orders AS (
            SELECT id, row_number() OVER (ORDER BY created_at, id) AS reference_number
            FROM orders
        )
        UPDATE orders AS order_record
        SET order_number = 'MAS-' || lpad(numbered_orders.reference_number::text, 5, '0')
        FROM numbered_orders
        WHERE order_record.id = numbered_orders.id
        """
    )
    op.execute(
        sa.text("SELECT setval('order_reference_seq', :last_value, :is_called)").bindparams(
            last_value=max(order_count, 1),
            is_called=order_count > 0,
        )
    )


def downgrade() -> None:
    op.execute("DROP SEQUENCE order_reference_seq")
