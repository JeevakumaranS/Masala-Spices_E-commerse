"""Add Twilio account and sender settings.

Revision ID: 20260930_twilio_settings
Revises: 20260930_brevo_sender
"""

from alembic import op
import sqlalchemy as sa

revision = "20260930_twilio_settings"
down_revision = "20260930_brevo_sender"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "admin_integration_settings",
        sa.Column("sms_account_sid_encrypted", sa.Text(), nullable=True),
    )
    op.add_column(
        "admin_integration_settings",
        sa.Column("sms_sender_phone", sa.String(length=32), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("admin_integration_settings", "sms_sender_phone")
    op.drop_column("admin_integration_settings", "sms_account_sid_encrypted")
