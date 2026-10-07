"""Store combo components directly on combo listings."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261013_combo_components_json"
down_revision = "20261012_drop_combo_products"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "combos",
        sa.Column(
            "catalog_products",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.execute(
        """
        UPDATE combos AS c
        SET catalog_products = COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', cp.id::text,
                        'product_id', cp.product_id::text,
                        'variant_id', cp.variant_id::text,
                        'quantity', cp.quantity,
                        'sort_order', cp.sort_order
                    )
                    ORDER BY cp.sort_order
                )
                FROM combo_catalog_products AS cp
                WHERE cp.combo_id = c.id
            ),
            '[]'::jsonb
        )
        """
    )
    op.drop_table("combo_catalog_products")
    op.execute("DROP TABLE IF EXISTS combo_products")


def downgrade() -> None:
    op.create_table(
        "combo_catalog_products",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("combo_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("variant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.CheckConstraint(
            "quantity > 0",
            name="ck_combo_catalog_products_quantity_positive",
        ),
        sa.ForeignKeyConstraint(["combo_id"], ["combos.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["variant_id"], ["product_variants.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("combo_id", "variant_id", name="uq_combo_catalog_variant"),
    )
    op.execute(
        """
        INSERT INTO combo_catalog_products
            (id, combo_id, product_id, variant_id, quantity, sort_order)
        SELECT
            (component->>'id')::uuid,
            c.id,
            (component->>'product_id')::uuid,
            (component->>'variant_id')::uuid,
            (component->>'quantity')::integer,
            (component->>'sort_order')::integer
        FROM combos AS c
        CROSS JOIN LATERAL jsonb_array_elements(c.catalog_products)
            AS components(component)
        """
    )
    op.drop_column("combos", "catalog_products")
