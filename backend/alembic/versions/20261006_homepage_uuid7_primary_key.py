"""Use UUIDv7 IDs for homepage settings."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261006_home_uuid7"
down_revision = "20261005_home_content"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "homepage_settings",
        "id",
        existing_type=sa.Integer(),
        server_default=None,
    )
    op.execute("DROP SEQUENCE IF EXISTS homepage_settings_id_seq")
    op.alter_column(
        "homepage_settings",
        "id",
        existing_type=sa.Integer(),
        type_=postgresql.UUID(as_uuid=True),
        existing_nullable=False,
        postgresql_using="uuidv7()",
    )
    op.alter_column(
        "homepage_settings",
        "id",
        existing_type=postgresql.UUID(as_uuid=True),
        server_default=sa.text("uuidv7()"),
    )


def downgrade() -> None:
    op.alter_column(
        "homepage_settings",
        "id",
        existing_type=postgresql.UUID(as_uuid=True),
        type_=sa.Integer(),
        existing_nullable=False,
        postgresql_using="1",
        server_default=None,
    )
