"""Persist editable homepage content."""

from alembic import op
import sqlalchemy as sa


revision = "20261001_homepage_settings"
down_revision = "20260930_product_cleanup"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "homepage_settings",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("homepage_settings")
