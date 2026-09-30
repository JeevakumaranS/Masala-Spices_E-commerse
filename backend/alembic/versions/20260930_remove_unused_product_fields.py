"""Remove unused product metadata fields."""

from alembic import op
import sqlalchemy as sa


revision = "20260930_product_cleanup"
down_revision = "20260930_hero_images"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for column in (
        "shelf_life",
        "is_all_in_one",
        "contains_ginger_garlic",
        "contains_tamarind",
        "fssai_license_no",
        "allergen_info",
    ):
        op.drop_column("products", column)


def downgrade() -> None:
    op.add_column("products", sa.Column("shelf_life", sa.String(length=120), nullable=True))
    op.add_column(
        "products",
        sa.Column("is_all_in_one", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "products",
        sa.Column("contains_ginger_garlic", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "products",
        sa.Column("contains_tamarind", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("products", sa.Column("fssai_license_no", sa.String(length=120), nullable=True))
    op.add_column("products", sa.Column("allergen_info", sa.Text(), nullable=True))
