"""Remove the obsolete combo-only products table."""

from alembic import op


revision = "20261012_drop_combo_products"
down_revision = "20261011_combo_catalog_products"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("combo_products")


def downgrade() -> None:
    raise RuntimeError(
        "The combo_products table cannot be restored because the combo-only "
        "product feature has been removed."
    )
