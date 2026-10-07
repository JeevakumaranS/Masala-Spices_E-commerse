"""Ensure notification integrations have a default settings row."""

from alembic import op
import sqlalchemy as sa


revision = "20261020_notification_settings"
down_revision = "20261019_collection_images"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "INSERT INTO notification_settings (sms_enabled, email_enabled) "
            "SELECT false, false "
            "WHERE NOT EXISTS (SELECT 1 FROM notification_settings)"
        )
    )


def downgrade() -> None:
    pass
