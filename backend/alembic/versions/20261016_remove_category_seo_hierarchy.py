"""Remove unused category hierarchy and SEO metadata."""

from alembic import op
import sqlalchemy as sa


revision = "20261016_category_meta"
down_revision = "20261015_merge_schema_heads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("categories_parent_id_fkey", "categories", type_="foreignkey")
    op.drop_column("categories", "parent_id")
    op.drop_column("categories", "seo_title")
    op.drop_column("categories", "seo_description")


def downgrade() -> None:
    op.add_column("categories", sa.Column("seo_description", sa.Text(), nullable=True))
    op.add_column("categories", sa.Column("seo_title", sa.String(), nullable=True))
    op.add_column("categories", sa.Column("parent_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "categories_parent_id_fkey",
        "categories",
        "categories",
        ["parent_id"],
        ["id"],
    )
