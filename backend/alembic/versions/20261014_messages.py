"""Persist contact and bulk-order messages."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261014_messages"
down_revision = "20261013_blog_posts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "messages",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("uuidv7()"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("phone", sa.String(length=24), nullable=True),
        sa.Column("company_name", sa.String(length=255), nullable=True),
        sa.Column("subject", sa.String(length=80), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("details", sa.JSON(), server_default=sa.text("'{}'"), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="new", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "subject IN ('General', 'Order issue', 'Wholesale', 'Export', 'Bulk orders')",
            name="ck_messages_subject",
        ),
        sa.CheckConstraint("source IN ('contact', 'bulk_order')", name="ck_messages_source"),
        sa.CheckConstraint("status IN ('new', 'read')", name="ck_messages_status"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_messages_subject_created_at", "messages", ["subject", "created_at"])
    op.create_index("ix_messages_status_created_at", "messages", ["status", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_messages_status_created_at", table_name="messages")
    op.drop_index("ix_messages_subject_created_at", table_name="messages")
    op.drop_table("messages")
