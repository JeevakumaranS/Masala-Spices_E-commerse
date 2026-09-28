"""Store administrator accounts and bootstrap-registration state.

Revision ID: 20260927_admin_accounts
Revises: 20260927_admin_store
"""

from alembic import op
import sqlalchemy as sa

revision = "20260927_admin_accounts"
down_revision = "20260927_admin_store"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admin_users",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("email", name="uq_admin_users_email"),
    )
    op.create_table(
        "admin_registration_state",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("bootstrap_complete", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.execute(
        sa.text(
            "INSERT INTO admin_registration_state (id, bootstrap_complete) VALUES (1, false)"
        )
    )


def downgrade() -> None:
    op.drop_table("admin_registration_state")
    op.drop_table("admin_users")
