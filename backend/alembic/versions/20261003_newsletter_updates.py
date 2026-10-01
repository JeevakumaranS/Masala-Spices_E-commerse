"""Store newsletter signup addresses."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261003_newsletter_updates"
down_revision = "20261002_product_bundles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "updates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirmation_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_updates_email"),
    )


def downgrade() -> None:
    op.drop_table("updates")
