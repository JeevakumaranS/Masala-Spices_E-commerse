"""Move product pricing to variants and remove unused product attributes.

Revision ID: 20261017_product_fields
Revises: 20261016_category_meta
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261017_product_fields"
down_revision = "20261016_category_meta"
branch_labels = None
depends_on = None


REMOVED_COLUMNS = (
    "ingredients",
    "price",
    "mrp",
    "discount_pct",
    "dish_type",
    "is_veg",
    "net_weight_options",
)


def upgrade() -> None:
    for column in REMOVED_COLUMNS:
        op.drop_column("products", column)


def downgrade() -> None:
    op.add_column("products", sa.Column("net_weight_options", postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column("products", sa.Column("is_veg", sa.Boolean(), nullable=True))
    op.add_column("products", sa.Column("dish_type", sa.String(length=120), nullable=True))
    op.add_column("products", sa.Column("discount_pct", sa.Integer(), nullable=True))
    op.add_column("products", sa.Column("mrp", sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column("products", sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column("products", sa.Column("ingredients", postgresql.ARRAY(sa.String()), nullable=True))
