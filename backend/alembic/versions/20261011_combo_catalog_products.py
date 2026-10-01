"""Allow regular catalog products in combos and clear prior combo-only packs."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261011_combo_catalog_products"
down_revision = "20261010_combo_pack_inventory"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DELETE FROM combo_products")
    op.create_table(
        "combo_catalog_products",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("uuidv7()"),
            nullable=False,
        ),
        sa.Column("combo_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("variant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.CheckConstraint("quantity > 0", name="ck_combo_catalog_products_quantity_positive"),
        sa.ForeignKeyConstraint(["combo_id"], ["combos.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["variant_id"], ["product_variants.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("combo_id", "variant_id", name="uq_combo_catalog_variant"),
    )


def downgrade() -> None:
    row_count = op.get_bind().execute(
        sa.text("SELECT count(*) FROM combo_catalog_products")
    ).scalar_one()
    if row_count:
        raise RuntimeError(
            "Cannot downgrade while combo_catalog_products contains regular "
            "product references; they cannot be converted to combo-only pack data."
        )
    op.drop_table("combo_catalog_products")
