"""Move combo listings and their components into dedicated tables."""

from uuid import UUID
from decimal import Decimal

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261008_separate_combos"
down_revision = "20261007_notify_plaintext"
branch_labels = None
depends_on = None


PRODUCT_COLUMNS = (
    "id",
    "name",
    "slug",
    "description",
    "price",
    "mrp",
    "discount_pct",
    "spice_level",
    "status",
    "categories",
    "images",
    "dish_type",
    "is_veg",
    "created_at",
    "updated_at",
)


def upgrade() -> None:
    op.create_table(
        "combos",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("slug", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Numeric(), nullable=True),
        sa.Column("mrp", sa.Numeric(), nullable=True),
        sa.Column("discount_pct", sa.Integer(), nullable=True),
        sa.Column("spice_level", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("categories", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("images", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("dish_type", sa.String(), nullable=True),
        sa.Column("is_veg", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_combos_slug"),
    )
    op.create_table(
        "combo_products",
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
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_combo_products_quantity_positive"),
        sa.ForeignKeyConstraint(["combo_id"], ["combos.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["variant_id"], ["product_variants.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.add_column(
        "product_reviews",
        sa.Column("combo_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.alter_column("product_reviews", "product_id", nullable=True)
    op.create_foreign_key(
        "fk_product_reviews_combo_id_combos",
        "product_reviews",
        "combos",
        ["combo_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_check_constraint(
        "ck_product_reviews_one_catalog_item",
        "product_reviews",
        "(product_id IS NOT NULL) <> (combo_id IS NOT NULL)",
    )

    connection = op.get_bind()
    products = sa.table(
        "products",
        *(sa.column(column) for column in PRODUCT_COLUMNS),
        sa.column("bundle_items", sa.JSON()),
    )
    combos = sa.table(
        "combos",
        *(sa.column(column) for column in PRODUCT_COLUMNS),
    )
    combo_products = sa.table(
        "combo_products",
        sa.column("combo_id", postgresql.UUID(as_uuid=True)),
        sa.column("product_id", postgresql.UUID(as_uuid=True)),
        sa.column("variant_id", postgresql.UUID(as_uuid=True)),
        sa.column("quantity", sa.Integer()),
        sa.column("sort_order", sa.Integer()),
    )
    review_table = sa.table(
        "product_reviews",
        sa.column("product_id", postgresql.UUID(as_uuid=True)),
        sa.column("combo_id", postgresql.UUID(as_uuid=True)),
    )
    rows = connection.execute(
        sa.select(*(products.c[column] for column in PRODUCT_COLUMNS), products.c.bundle_items)
        .where(sa.text("json_array_length(bundle_items) > 0"))
    ).mappings().all()

    for row in rows:
        variant_count = connection.execute(
            sa.text("SELECT count(*) FROM product_variants WHERE product_id = :id"),
            {"id": row["id"]},
        ).scalar_one()
        if variant_count:
            raise RuntimeError(
                f"Cannot move combo {row['id']}: combo listings with their own "
                "product variants are not supported."
            )

        components = []
        for item in row["bundle_items"] or []:
            try:
                product_id = UUID(str(item["product_id"]))
                variant_id = UUID(str(item["variant_id"]))
                quantity = int(item["quantity"])
                if quantity < 1:
                    raise ValueError
            except (KeyError, TypeError, ValueError) as exc:
                raise RuntimeError(
                    f"Cannot migrate combo {row['id']}: a component row is invalid."
                ) from exc

            product_exists = connection.execute(
                sa.text("SELECT 1 FROM products WHERE id = :id"),
                {"id": product_id},
            ).scalar_one_or_none()
            if product_exists is None:
                raise RuntimeError(
                    f"Cannot migrate combo {row['id']}: a component product no longer exists."
                )
            variant = connection.execute(
                sa.text(
                    "SELECT product_id, mrp FROM product_variants WHERE id = :id"
                ),
                {"id": variant_id},
            ).mappings().first()
            if variant is not None and variant["product_id"] != product_id:
                raise RuntimeError(
                    f"Cannot migrate combo {row['id']}: a component variant belongs "
                    "to a different product."
                )
            components.append({
                "product_id": product_id,
                "variant_id": variant_id,
                "quantity": quantity,
                "mrp": Decimal(str(variant["mrp"])) if variant is not None else None,
            })

        missing_variants = [item for item in components if item["mrp"] is None]
        if missing_variants:
            if len(missing_variants) != 1:
                raise RuntimeError(
                    f"Cannot migrate combo {row['id']}: multiple component variants "
                    "are missing, so they cannot be repaired unambiguously."
                )
            missing = missing_variants[0]
            remaining_mrp = Decimal(str(row["mrp"])) - sum(
                item["mrp"] * item["quantity"]
                for item in components
                if item["mrp"] is not None
            )
            candidates = connection.execute(
                sa.text(
                    "SELECT id, mrp FROM product_variants WHERE product_id = :product_id"
                ),
                {"product_id": missing["product_id"]},
            ).mappings().all()
            matches = [
                candidate
                for candidate in candidates
                if Decimal(str(candidate["mrp"])) * missing["quantity"] == remaining_mrp
            ]
            if len(matches) != 1:
                raise RuntimeError(
                    f"Cannot migrate combo {row['id']}: a missing component variant "
                    "does not have one unique matching-MRP replacement."
                )
            missing["variant_id"] = matches[0]["id"]
            missing["mrp"] = Decimal(str(matches[0]["mrp"]))

        combined_mrp = sum(
            item["mrp"] * item["quantity"]
            for item in components
        )
        if combined_mrp != Decimal(str(row["mrp"])):
            raise RuntimeError(
                f"Cannot migrate combo {row['id']}: component MRPs do not match "
                "the combo's stored regular price."
            )
        if sum(item["quantity"] for item in components) < 2:
            raise RuntimeError(
                f"Cannot migrate combo {row['id']}: it contains fewer than two units."
            )

        connection.execute(
            sa.insert(combos).values(
                **{column: row[column] for column in PRODUCT_COLUMNS}
            )
        )
        for sort_order, item in enumerate(components):
            connection.execute(
                sa.insert(combo_products).values(
                    combo_id=row["id"],
                    product_id=item["product_id"],
                    variant_id=item["variant_id"],
                    quantity=item["quantity"],
                    sort_order=sort_order,
                )
            )

        connection.execute(
            sa.update(review_table)
            .where(review_table.c.product_id == row["id"])
            .values(product_id=None, combo_id=row["id"])
        )
        connection.execute(
            sa.delete(products).where(products.c.id == row["id"])
        )

    op.drop_column("products", "bundle_items")


def downgrade() -> None:
    op.add_column(
        "products",
        sa.Column(
            "bundle_items",
            sa.JSON(),
            server_default=sa.text("'[]'::json"),
            nullable=False,
        ),
    )
    connection = op.get_bind()
    products = sa.table(
        "products",
        *(sa.column(column) for column in PRODUCT_COLUMNS),
        sa.column("bundle_items", sa.JSON()),
    )
    combos = sa.table("combos", *(sa.column(column) for column in PRODUCT_COLUMNS))
    combo_products = sa.table(
        "combo_products",
        sa.column("combo_id", postgresql.UUID(as_uuid=True)),
        sa.column("product_id", postgresql.UUID(as_uuid=True)),
        sa.column("variant_id", postgresql.UUID(as_uuid=True)),
        sa.column("quantity", sa.Integer()),
        sa.column("sort_order", sa.Integer()),
    )
    review_table = sa.table(
        "product_reviews",
        sa.column("product_id", postgresql.UUID(as_uuid=True)),
        sa.column("combo_id", postgresql.UUID(as_uuid=True)),
    )
    rows = connection.execute(sa.select(combos)).mappings().all()
    for row in rows:
        component_rows = connection.execute(
            sa.select(
                combo_products.c.product_id,
                combo_products.c.variant_id,
                combo_products.c.quantity,
            )
            .where(combo_products.c.combo_id == row["id"])
            .order_by(combo_products.c.sort_order)
        ).mappings().all()
        bundle_items = [
            {
                "product_id": str(item["product_id"]),
                "variant_id": str(item["variant_id"]),
                "quantity": item["quantity"],
            }
            for item in component_rows
        ]
        connection.execute(
            sa.insert(products).values(
                **{column: row[column] for column in PRODUCT_COLUMNS},
                bundle_items=bundle_items,
            )
        )
        connection.execute(
            sa.update(review_table)
            .where(review_table.c.combo_id == row["id"])
            .values(product_id=row["id"], combo_id=None)
        )

    op.drop_constraint(
        "ck_product_reviews_one_catalog_item",
        "product_reviews",
        type_="check",
    )
    op.drop_constraint(
        "fk_product_reviews_combo_id_combos",
        "product_reviews",
        type_="foreignkey",
    )
    op.drop_column("product_reviews", "combo_id")
    op.alter_column("product_reviews", "product_id", nullable=False)
    op.drop_table("combo_products")
    op.drop_table("combos")
