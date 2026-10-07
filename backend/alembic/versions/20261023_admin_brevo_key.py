"""Store the admin-managed Brevo API key."""

from alembic import op
import sqlalchemy as sa


revision = "20261023_admin_brevo_key"
down_revision = "20261022_remove_sample_coupons"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notification_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email_api_key", sa.Text(), nullable=True),
        sa.CheckConstraint("id = 1", name="ck_notification_settings_singleton"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("notification_settings")
