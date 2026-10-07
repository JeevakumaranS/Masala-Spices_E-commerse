"""Store an optional RustFS image key for each collection."""

from alembic import op
import sqlalchemy as sa


revision = "20261019_collection_images"
down_revision = "20261018_uploaded_photos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("categories", sa.Column("image_key", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("categories", "image_key")
