"""Remove obsolete first-admin registration state.

Revision ID: 20260928_admin_state
Revises: 20260927_admin_accounts
"""

from alembic import op
import sqlalchemy as sa

revision = "20260928_admin_state"
down_revision = "20260927_admin_accounts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("admin_registration_state")


def downgrade() -> None:
    op.create_table(
        "admin_registration_state",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("bootstrap_complete", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.execute(
        sa.text(
            "INSERT INTO admin_registration_state (id, bootstrap_complete) "
            "SELECT 1, EXISTS (SELECT 1 FROM admin_users)"
        )
    )
