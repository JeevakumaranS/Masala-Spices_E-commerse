"""Add encrypted SMS and email integration settings.

Revision ID: 20260929_api_settings
Revises: 20260928_admin_state
"""

from alembic import op
import sqlalchemy as sa

revision = "20260929_api_settings"
down_revision = "20260928_admin_state"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admin_integration_settings",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("sms_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("sms_api_key_encrypted", sa.Text(), nullable=True),
        sa.Column("email_api_key_encrypted", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.execute(
        sa.text(
            "INSERT INTO admin_integration_settings "
            "(id, sms_enabled, email_enabled) VALUES (1, false, false)"
        )
    )


def downgrade() -> None:
    op.drop_table("admin_integration_settings")
