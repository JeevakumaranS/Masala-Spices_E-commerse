"""Define uuidv7() PostgreSQL function.

Revision ID: 20260928_uuid7_function
Revises: 20260928_uuid7_array
Create Date: 2026-09-28
"""

from alembic import op

revision = "20260928_uuid7_function"
down_revision = "20260930_order_shipping"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION uuidv7()
        RETURNS uuid
        AS $$
        SELECT encode(
            set_bit(
                set_bit(
                    overlay(uuid_send(gen_random_uuid())
                            placing substring(int8send((extract(epoch FROM clock_timestamp()) * 1000)::bigint)
                                        from 3)
                            from 1 for 6),
                    52, 1),
                53, 1),
            'hex')::uuid;
        $$
        LANGUAGE sql
        VOLATILE;
        """
    )


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS uuidv7();")
