"""Add sender identity for Brevo transactional email.

Revision ID: 20260930_brevo_sender
Revises: 20260929_api_settings
"""

from alembic import op
import sqlalchemy as sa

revision = "20260930_brevo_sender"
down_revision = "20260929_api_settings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "admin_integration_settings",
        sa.Column("email_sender_name", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "admin_integration_settings",
        sa.Column("email_sender_email", sa.String(length=254), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("admin_integration_settings", "email_sender_email")
    op.drop_column("admin_integration_settings", "email_sender_name")
