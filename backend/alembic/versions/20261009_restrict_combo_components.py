"""Prevent deleting catalog items referenced by combos."""

from alembic import op


revision = "20261009_combo_fk_restrict"
down_revision = "20261008_separate_combos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "combo_products_product_id_fkey",
        "combo_products",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "combo_products_product_id_fkey",
        "combo_products",
        "products",
        ["product_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.drop_constraint(
        "combo_products_variant_id_fkey",
        "combo_products",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "combo_products_variant_id_fkey",
        "combo_products",
        "product_variants",
        ["variant_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint(
        "combo_products_variant_id_fkey",
        "combo_products",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "combo_products_variant_id_fkey",
        "combo_products",
        "product_variants",
        ["variant_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.drop_constraint(
        "combo_products_product_id_fkey",
        "combo_products",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "combo_products_product_id_fkey",
        "combo_products",
        "products",
        ["product_id"],
        ["id"],
        ondelete="CASCADE",
    )
