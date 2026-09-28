"""Store catalog categories, images, and recipes."""

from alembic import op
import sqlalchemy as sa

revision = "20260925_catalog_storage"
down_revision = "20260923_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("products", sa.Column("categories", sa.JSON(), nullable=True))
    op.add_column("products", sa.Column("images", sa.JSON(), nullable=True))
    op.add_column("products", sa.Column("dish_type", sa.String(length=120), nullable=True))
    op.add_column("products", sa.Column("is_veg", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.create_table(
        "recipes",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False, unique=True),
        sa.Column("cook_time_minutes", sa.Integer(), nullable=False),
        sa.Column("cuisine", sa.String(length=120), nullable=False),
        sa.Column("dish_type", sa.String(length=120), nullable=False),
        sa.Column("ingredients", sa.JSON(), nullable=True),
        sa.Column("steps", sa.JSON(), nullable=True),
        sa.Column("hero_image_url", sa.Text(), nullable=False),
        sa.Column("video_url", sa.Text(), nullable=True),
    )
    op.create_index("ix_recipes_slug", "recipes", ["slug"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_recipes_slug", table_name="recipes")
    op.drop_table("recipes")
    op.drop_column("products", "images")
    op.drop_column("products", "categories")
    op.drop_column("products", "dish_type")
    op.drop_column("products", "is_veg")
