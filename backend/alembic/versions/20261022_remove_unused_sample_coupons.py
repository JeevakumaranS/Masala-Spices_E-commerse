"""Remove unused coupons created by the original sample-data migration."""

from alembic import op
import sqlalchemy as sa


revision = "20261022_remove_sample_coupons"
down_revision = "20261021_env_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            DELETE FROM coupons AS coupon
            WHERE NOT EXISTS (
                SELECT 1
                FROM orders AS customer_order
                WHERE upper(customer_order.coupon_code) = coupon.code
            )
            AND (
                (
                    coupon.code IN ('FIRST10', 'WELCOME10')
                    AND coupon.kind = 'percentage'
                    AND coupon.label = U&'10% off your first order (up to \\20B9 100)'
                    AND coupon.discount_value = 10
                    AND coupon.minimum_order = 349
                    AND coupon.max_discount = 100
                    AND coupon.active IS TRUE
                    AND coupon.starts_at IS NULL
                    AND coupon.ends_at IS NULL
                    AND coupon.buy_quantity = 0
                    AND coupon.free_quantity = 0
                    AND cardinality(coupon.eligible_terms) = 0
                    AND coupon.first_order_only IS TRUE
                )
                OR (
                    coupon.code = 'FESTIVE20'
                    AND coupon.kind = 'percentage'
                    AND coupon.label = U&'20% festive discount on orders above \\20B9 999 (up to \\20B9 250)'
                    AND coupon.discount_value = 20
                    AND coupon.minimum_order = 999
                    AND coupon.max_discount = 250
                    AND coupon.active IS TRUE
                    AND coupon.starts_at = DATE '2026-09-15'
                    AND coupon.ends_at = DATE '2026-10-15'
                    AND coupon.buy_quantity = 0
                    AND coupon.free_quantity = 0
                    AND cardinality(coupon.eligible_terms) = 0
                    AND coupon.first_order_only IS FALSE
                )
                OR (
                    coupon.code = 'BIRYANI3'
                    AND coupon.kind = 'buy_x_get_y'
                    AND coupon.label = 'Buy 2 Biryani blends, get the 3rd free'
                    AND coupon.discount_value = 0
                    AND coupon.minimum_order = 0
                    AND coupon.max_discount IS NULL
                    AND coupon.active IS TRUE
                    AND coupon.starts_at IS NULL
                    AND coupon.ends_at IS NULL
                    AND coupon.buy_quantity = 2
                    AND coupon.free_quantity = 1
                    AND coupon.eligible_terms = ARRAY['biryani', 'biriyani']::text[]
                    AND coupon.first_order_only IS FALSE
                )
            )
            """
        )
    )


def downgrade() -> None:
    pass
