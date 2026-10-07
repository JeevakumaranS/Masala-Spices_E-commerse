"""Allow custom contact-message subjects."""

from alembic import op
import sqlalchemy as sa


revision = "20261028_freeform_subjects"
down_revision = "20261027_guest_item_order"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_messages_subject", "messages", type_="check")


def downgrade() -> None:
    op.create_check_constraint(
        "ck_messages_subject",
        "messages",
        sa.text(
            "subject IN ('General', 'Order issue', 'Wholesale', 'Export', 'Bulk orders')"
        ),
    )
