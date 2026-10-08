"""Add admin-managed Apps Script URL and email templates."""

from alembic import op
import sqlalchemy as sa


revision = "20261030_admin_email_templates"
down_revision = "20261029_message_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "notification_settings",
        sa.Column("google_apps_script_url", sa.Text(), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("order_confirmation_subject", sa.Text(), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("order_confirmation_template", sa.Text(), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("order_status_subject", sa.Text(), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("order_status_template", sa.Text(), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("newsletter_subject", sa.Text(), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("newsletter_template", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("notification_settings", "newsletter_template")
    op.drop_column("notification_settings", "newsletter_subject")
    op.drop_column("notification_settings", "order_status_template")
    op.drop_column("notification_settings", "order_status_subject")
    op.drop_column("notification_settings", "order_confirmation_template")
    op.drop_column("notification_settings", "order_confirmation_subject")
    op.drop_column("notification_settings", "google_apps_script_url")
