"""Remove database-stored notification provider settings."""

from alembic import op
import sqlalchemy as sa


revision = "20261021_env_notifications"
down_revision = "20261020_notification_settings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("notification_settings")


def downgrade() -> None:
    op.create_table(
        "notification_settings",
        sa.Column("id", sa.Uuid(), nullable=False, server_default=sa.text("uuidv7()")),
        sa.Column("sms_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("sms_api_key", sa.Text(), nullable=True),
        sa.Column("sms_account_sid", sa.Text(), nullable=True),
        sa.Column("sms_sender_phone", sa.String(), nullable=True),
        sa.Column("email_api_key", sa.Text(), nullable=True),
        sa.Column("email_sender_name", sa.String(), nullable=True),
        sa.Column("email_sender_email", sa.String(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
