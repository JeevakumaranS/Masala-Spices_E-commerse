"""Normalize product image text arrays to contain only URLs.

Revision ID: 20260929_product_image_urls
Revises: 20260928_uuid7_array
"""

from alembic import op

revision = "20260929_product_image_urls"
down_revision = "20260928_uuid7_array"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE products AS product
        SET images = (
            SELECT array_agg(
                CASE
                    WHEN left(ltrim(image.value), 1) = '{'
                        THEN (image.value::json ->> 'url')
                    ELSE image.value
                END
                ORDER BY image.ordinality
            ) AS urls
            FROM unnest(product.images) WITH ORDINALITY AS image(value, ordinality)
        )
        WHERE EXISTS (
            SELECT 1
            FROM unnest(product.images) AS image(value)
            WHERE left(ltrim(image.value), 1) = '{'
        )
        """
    )


def downgrade() -> None:
    pass
