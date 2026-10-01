"""Store the product and pack contents of combo products."""

from alembic import op
import sqlalchemy as sa


revision = "20261002_product_bundles"
down_revision = "20261001_homepage_settings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column(
            "bundle_items",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'::json"),
        ),
    )


def downgrade() -> None:
    op.drop_column("products", "bundle_items")
