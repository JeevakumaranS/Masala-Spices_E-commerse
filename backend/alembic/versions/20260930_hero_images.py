"""Add configurable homepage hero images."""

from alembic import op
import sqlalchemy as sa


revision = "20260930_hero_images"
down_revision = "20260928_uuid7_function"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "hero_images",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("object_key", sa.String(), nullable=False, unique=True),
        sa.Column("alt_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("hero_images")
