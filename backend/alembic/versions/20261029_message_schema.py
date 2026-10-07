"""Simplify message records and use an enum for message status."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261029_message_schema"
down_revision = "20261028_freeform_subjects"
branch_labels = None
depends_on = None

message_status = postgresql.ENUM("new", "read", name="message_status")


def upgrade() -> None:
    op.drop_constraint("ck_messages_status", "messages", type_="check")
    op.drop_constraint("ck_messages_source", "messages", type_="check")
    op.drop_column("messages", "company_name")
    op.drop_column("messages", "details")
    op.drop_column("messages", "source")

    message_status.create(op.get_bind(), checkfirst=True)
    op.alter_column("messages", "status", server_default=None)
    op.alter_column(
        "messages",
        "status",
        type_=message_status,
        postgresql_using="status::message_status",
    )
    op.alter_column("messages", "status", server_default="new")


def downgrade() -> None:
    op.alter_column("messages", "status", server_default=None)
    op.alter_column(
        "messages",
        "status",
        type_=sa.String(length=20),
        postgresql_using="status::text",
    )
    message_status.drop(op.get_bind(), checkfirst=True)
    op.create_check_constraint(
        "ck_messages_status",
        "messages",
        "status IN ('new', 'read')",
    )
    op.add_column("messages", sa.Column("company_name", sa.String(length=255)))
    op.add_column(
        "messages",
        sa.Column(
            "details",
            sa.JSON(),
            server_default=sa.text("'{}'"),
            nullable=False,
        ),
    )
    op.add_column("messages", sa.Column("source", sa.String(length=32)))
    op.execute("UPDATE messages SET source = 'contact' WHERE source IS NULL")
    op.alter_column("messages", "source", nullable=False)
    op.alter_column("messages", "status", server_default="new")
    op.create_check_constraint(
        "ck_messages_source",
        "messages",
        "source IN ('contact', 'bulk_order')",
    )
