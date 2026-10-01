"""Store combo-only product details and inventory directly."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261010_combo_pack_inventory"
down_revision = "20261009_combo_fk_restrict"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("combo_products", sa.Column("name", sa.String(), nullable=True))
    op.add_column("combo_products", sa.Column("pack_size", sa.String(), nullable=True))
    op.add_column("combo_products", sa.Column("sku", sa.String(), nullable=True))
    op.add_column("combo_products", sa.Column("price", sa.Numeric(), nullable=True))
    op.add_column("combo_products", sa.Column("mrp", sa.Numeric(), nullable=True))
    op.add_column("combo_products", sa.Column("stock_qty", sa.Integer(), nullable=True))

    op.execute(
        """
        UPDATE combo_products AS cp
        SET name = p.name,
            pack_size = v.pack_size,
            sku = v.sku,
            price = v.price,
            mrp = v.mrp,
            stock_qty = v.stock_qty
        FROM products AS p, product_variants AS v
        WHERE cp.product_id = p.id
          AND cp.variant_id = v.id
        """
    )
    op.alter_column("combo_products", "name", nullable=False)
    op.alter_column("combo_products", "pack_size", nullable=False)
    op.alter_column("combo_products", "sku", nullable=False)
    op.alter_column("combo_products", "price", nullable=False)
    op.alter_column("combo_products", "mrp", nullable=False)
    op.alter_column("combo_products", "stock_qty", nullable=False)

    op.drop_constraint(
        "combo_products_product_id_fkey",
        "combo_products",
        type_="foreignkey",
    )
    op.drop_constraint(
        "combo_products_variant_id_fkey",
        "combo_products",
        type_="foreignkey",
    )
    op.drop_column("combo_products", "product_id")
    op.drop_column("combo_products", "variant_id")


def downgrade() -> None:
    connection = op.get_bind()
    row_count = connection.execute(
        sa.text("SELECT count(*) FROM combo_products")
    ).scalar_one()
    if row_count:
        raise RuntimeError(
            "Cannot downgrade combo-only pack inventory while combo_products "
            "contains rows; its standalone product details cannot be safely "
            "mapped back to regular catalog products."
        )

    op.add_column(
        "combo_products",
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "combo_products",
        sa.Column("variant_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.drop_column("combo_products", "stock_qty")
    op.drop_column("combo_products", "mrp")
    op.drop_column("combo_products", "price")
    op.drop_column("combo_products", "sku")
    op.drop_column("combo_products", "pack_size")
    op.drop_column("combo_products", "name")
