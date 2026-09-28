"""Migrate to UUID v7 primary keys and ARRAY types.

Revision ID: 20260928_uuid7_array
Revises: 20260930_twilio_settings
Create Date: 2026-09-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, UUID

revision = "20260928_uuid7_array"
down_revision = "20260930_twilio_settings"
branch_labels = None
depends_on = None


def _json_array_column_to_text_array(table: str, column: str) -> None:
    array_column = f"{column}_array"
    op.add_column(table, sa.Column(array_column, ARRAY(sa.Text()), nullable=True))
    op.execute(
        f"""
        UPDATE {table}
        SET {array_column} = CASE
            WHEN json_typeof({column}) = 'array'
                THEN ARRAY(SELECT json_array_elements_text({column}))
            ELSE ARRAY[]::text[]
        END
        """
    )
    op.drop_column(table, column)
    op.alter_column(table, array_column, new_column_name=column)


def upgrade() -> None:
    # ── 1. Create new UUID columns alongside existing integer columns ──

    # categories
    op.add_column("categories", sa.Column("id_new", UUID(), nullable=True))
    op.execute(
        "UPDATE categories SET id_new = uuidv7() WHERE id_new IS NULL"
    )
    op.alter_column("categories", "id_new", nullable=False)
    op.add_column("categories", sa.Column("parent_id_new", UUID(), nullable=True))

    # products
    op.add_column("products", sa.Column("id_new", UUID(), nullable=True))
    op.execute(
        "UPDATE products SET id_new = uuidv7() WHERE id_new IS NULL"
    )
    op.alter_column("products", "id_new", nullable=False)

    # product_variants
    op.add_column("product_variants", sa.Column("id_new", UUID(), nullable=True))
    op.execute(
        "UPDATE product_variants SET id_new = uuidv7() WHERE id_new IS NULL"
    )
    op.alter_column("product_variants", "id_new", nullable=False)
    op.add_column(
        "product_variants",
        sa.Column("product_id_new", UUID(), nullable=True),
    )

    # admin_users
    op.add_column("admin_users", sa.Column("id_new", UUID(), nullable=True))
    op.execute(
        "UPDATE admin_users SET id_new = uuidv7() WHERE id_new IS NULL"
    )
    op.alter_column("admin_users", "id_new", nullable=False)

    # admin_integration_settings
    op.add_column(
        "admin_integration_settings", sa.Column("id_new", UUID(), nullable=True)
    )
    op.execute(
        "UPDATE admin_integration_settings SET id_new = uuidv7() WHERE id_new IS NULL"
    )
    op.alter_column("admin_integration_settings", "id_new", nullable=False)

    # orders
    op.add_column("orders", sa.Column("id_new", UUID(), nullable=True))
    op.execute(
        "UPDATE orders SET id_new = uuidv7() WHERE id_new IS NULL"
    )
    op.alter_column("orders", "id_new", nullable=False)

    # coupons
    op.add_column("coupons", sa.Column("id_new", UUID(), nullable=True))
    op.execute(
        "UPDATE coupons SET id_new = uuidv7() WHERE id_new IS NULL"
    )
    op.alter_column("coupons", "id_new", nullable=False)

    # product_reviews
    op.add_column("product_reviews", sa.Column("id_new", UUID(), nullable=True))
    op.execute(
        "UPDATE product_reviews SET id_new = uuidv7() WHERE id_new IS NULL"
    )
    op.alter_column("product_reviews", "id_new", nullable=False)
    op.add_column(
        "product_reviews",
        sa.Column("product_id_new", UUID(), nullable=True),
    )

    # recipes
    op.add_column("recipes", sa.Column("id_new", UUID(), nullable=True))
    op.execute(
        "UPDATE recipes SET id_new = uuidv7() WHERE id_new IS NULL"
    )
    op.alter_column("recipes", "id_new", nullable=False)

    # ── 2. Remap foreign key references ──

    # product_variants.product_id -> products.id
    op.execute(
        """
        UPDATE product_variants pv
        SET product_id_new = p.id_new
        FROM products p
        WHERE pv.product_id = p.id
        """
    )

    # product_reviews.product_id -> products.id
    op.execute(
        """
        UPDATE product_reviews pr
        SET product_id_new = p.id_new
        FROM products p
        WHERE pr.product_id = p.id
        """
    )

    # categories.parent_id -> categories.id
    op.execute(
        """
        UPDATE categories child
        SET parent_id_new = parent.id_new
        FROM categories parent
        WHERE child.parent_id = parent.id
        """
    )

    # ── 3. Convert JSON columns to ARRAY(String) ──

    for table, column in (
        ("products", "ingredients"),
        ("products", "categories"),
        ("products", "images"),
        ("products", "net_weight_options"),
        ("coupons", "eligible_terms"),
        ("recipes", "ingredients"),
        ("recipes", "steps"),
    ):
        _json_array_column_to_text_array(table, column)

    # ── 4. Normalize orders.order_data into structured columns + child tables ──

    # Add scalar columns to orders
    op.add_column("orders", sa.Column("customer_name", sa.String(), nullable=True))
    op.add_column("orders", sa.Column("payment_status", sa.String(), nullable=True))
    op.add_column("orders", sa.Column("subtotal", sa.Numeric(12, 2), nullable=True))
    op.add_column("orders", sa.Column("shipping_amount", sa.Numeric(12, 2), nullable=True))
    op.add_column("orders", sa.Column("discount_amount", sa.Numeric(12, 2), nullable=True))
    op.add_column("orders", sa.Column("coupon_code", sa.String(), nullable=True))
    op.add_column("orders", sa.Column("coupon_label", sa.String(), nullable=True))
    op.add_column("orders", sa.Column("delivery_mode", sa.String(), nullable=True))
    op.add_column("orders", sa.Column("country_code", sa.String(), nullable=True))
    op.add_column("orders", sa.Column("shipping_note", sa.Text(), nullable=True))
    op.add_column("orders", sa.Column("item_count", sa.Integer(), nullable=True))
    op.add_column("orders", sa.Column("address_line", sa.Text(), nullable=True))
    op.add_column("orders", sa.Column("city", sa.String(), nullable=True))
    op.add_column("orders", sa.Column("state", sa.String(), nullable=True))
    op.add_column("orders", sa.Column("postal_code", sa.String(), nullable=True))
    op.add_column("orders", sa.Column("admin_note", sa.Text(), nullable=True))
    op.add_column("orders", sa.Column("payment_note", sa.Text(), nullable=True))

    # Populate scalar columns from order_data JSON
    op.execute(
        """
        UPDATE orders SET
            customer_name = order_data->>'customer_name',
            payment_status = order_data->>'payment_status',
            subtotal = (order_data->>'subtotal')::numeric,
            shipping_amount = (order_data->>'shipping_amount')::numeric,
            discount_amount = (order_data->>'discount_amount')::numeric,
            coupon_code = order_data->>'coupon_code',
            coupon_label = order_data->>'coupon_label',
            delivery_mode = order_data->>'delivery_mode',
            country_code = order_data->>'country_code',
            shipping_note = order_data->>'shipping_note',
            item_count = (order_data->>'item_count')::int,
            address_line = order_data->>'address_line',
            city = order_data->>'city',
            state = order_data->>'state',
            postal_code = order_data->>'postal_code',
            admin_note = order_data->>'admin_note',
            payment_note = order_data->>'payment_note'
        """
    )

    # Create order_items table
    op.create_table(
        "order_items",
        sa.Column("id", UUID(), primary_key=True, nullable=False),
        sa.Column("order_id", UUID(), nullable=False),
        sa.Column("product_id", UUID(), nullable=True),
        sa.Column("variant_id", UUID(), nullable=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("pack_size", sa.String(), nullable=True),
        sa.Column("sku", sa.String(), nullable=True),
        sa.Column("dish_type", sa.String(), nullable=True),
        sa.Column("categories", ARRAY(sa.String()), nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=True),
        sa.Column("qty", sa.Integer(), nullable=True),
        sa.Column("line_total", sa.Numeric(12, 2), nullable=True),
    )

    # Populate order_items from order_data JSON
    op.execute(
        """
        INSERT INTO order_items (id, order_id, product_id, variant_id, name, pack_size, sku, dish_type, categories, price, qty, line_total)
        SELECT
            uuidv7(),
            o.id_new,
            p.id_new,
            pv.id_new,
            item->>'name',
            item->>'pack_size',
            item->>'sku',
            item->>'dish_type',
            ARRAY(SELECT json_array_elements_text(item->'categories')),
            (item->>'price')::numeric,
            (item->>'qty')::int,
            (item->>'line_total')::numeric
        FROM orders o
        CROSS JOIN LATERAL json_array_elements(o.order_data->'items') AS item
        LEFT JOIN products p ON p.id = (item->>'product_id')::integer
        LEFT JOIN product_variants pv ON pv.id = (item->>'variant_id')::integer
        WHERE json_typeof(o.order_data->'items') = 'array'
        """
    )

    # Create order_history table
    op.create_table(
        "order_history",
        sa.Column("id", UUID(), primary_key=True, nullable=False),
        sa.Column("order_id", UUID(), nullable=False),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
    )

    # Populate order_history from order_data JSON
    op.execute(
        """
        INSERT INTO order_history (id, order_id, status, changed_at, note)
        SELECT
            uuidv7(),
            o.id_new,
            event->>'status',
            (event->>'changed_at')::timestamptz,
            event->>'note'
        FROM orders o
        CROSS JOIN LATERAL json_array_elements(o.order_data->'history') AS event
        WHERE json_typeof(o.order_data->'history') = 'array'
        """
    )

    # Drop the old order_data JSON column
    op.drop_column("orders", "order_data")

    # ── 5. Swap integer PKs for UUID PKs ──

    # Drop old FK constraints
    op.drop_constraint("product_variants_product_id_fkey", "product_variants", type_="foreignkey")
    op.drop_constraint("product_reviews_product_id_fkey", "product_reviews", type_="foreignkey")

    # Drop old PK constraints
    op.drop_constraint("categories_pkey", "categories", type_="primary")
    op.drop_constraint("products_pkey", "products", type_="primary")
    op.drop_constraint("product_variants_pkey", "product_variants", type_="primary")
    op.drop_constraint("admin_users_pkey", "admin_users", type_="primary")
    op.drop_constraint("admin_integration_settings_pkey", "admin_integration_settings", type_="primary")
    op.drop_constraint("orders_pkey", "orders", type_="primary")
    op.drop_constraint("coupons_pkey", "coupons", type_="primary")
    op.drop_constraint("product_reviews_pkey", "product_reviews", type_="primary")
    op.drop_constraint("recipes_pkey", "recipes", type_="primary")

    # Drop old columns
    op.drop_column("categories", "parent_id")
    op.drop_column("categories", "id")
    op.drop_column("products", "id")
    op.drop_column("product_variants", "id")
    op.drop_column("product_variants", "product_id")
    op.drop_column("admin_users", "id")
    op.drop_column("admin_integration_settings", "id")
    op.drop_column("orders", "id")
    op.drop_column("coupons", "id")
    op.drop_column("product_reviews", "id")
    op.drop_column("product_reviews", "product_id")
    op.drop_column("recipes", "id")

    # Rename new columns
    op.alter_column("categories", "id_new", new_column_name="id")
    op.alter_column("categories", "parent_id_new", new_column_name="parent_id")
    op.alter_column("products", "id_new", new_column_name="id")
    op.alter_column("product_variants", "id_new", new_column_name="id")
    op.alter_column("product_variants", "product_id_new", new_column_name="product_id")
    op.alter_column("admin_users", "id_new", new_column_name="id")
    op.alter_column("admin_integration_settings", "id_new", new_column_name="id")
    op.alter_column("orders", "id_new", new_column_name="id")
    op.alter_column("coupons", "id_new", new_column_name="id")
    op.alter_column("product_reviews", "id_new", new_column_name="id")
    op.alter_column("product_reviews", "product_id_new", new_column_name="product_id")
    op.alter_column("recipes", "id_new", new_column_name="id")

    # Add new PK constraints
    op.create_primary_key("categories_pkey", "categories", ["id"])
    op.create_primary_key("products_pkey", "products", ["id"])
    op.create_primary_key("product_variants_pkey", "product_variants", ["id"])
    op.create_primary_key("admin_users_pkey", "admin_users", ["id"])
    op.create_primary_key("admin_integration_settings_pkey", "admin_integration_settings", ["id"])
    op.create_primary_key("orders_pkey", "orders", ["id"])
    op.create_primary_key("coupons_pkey", "coupons", ["id"])
    op.create_primary_key("product_reviews_pkey", "product_reviews", ["id"])
    op.create_primary_key("recipes_pkey", "recipes", ["id"])

    # Add new FK constraints
    op.create_foreign_key(
        "product_variants_product_id_fkey",
        "product_variants",
        "products",
        ["product_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "product_reviews_product_id_fkey",
        "product_reviews",
        "products",
        ["product_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "categories_parent_id_fkey",
        "categories",
        "categories",
        ["parent_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "order_items_order_id_fkey",
        "order_items",
        "orders",
        ["order_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "order_history_order_id_fkey",
        "order_history",
        "orders",
        ["order_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Add indexes
    op.create_index("ix_product_variants_product_id", "product_variants", ["product_id"])
    op.create_index("ix_product_reviews_product_id", "product_reviews", ["product_id"])
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])
    op.create_index("ix_order_history_order_id", "order_history", ["order_id"])

    # Set defaults for new UUID columns
    op.alter_column("categories", "id", server_default=sa.text("uuidv7()"))
    op.alter_column("products", "id", server_default=sa.text("uuidv7()"))
    op.alter_column("product_variants", "id", server_default=sa.text("uuidv7()"))
    op.alter_column("admin_users", "id", server_default=sa.text("uuidv7()"))
    op.alter_column("admin_integration_settings", "id", server_default=sa.text("uuidv7()"))
    op.alter_column("orders", "id", server_default=sa.text("uuidv7()"))
    op.alter_column("coupons", "id", server_default=sa.text("uuidv7()"))
    op.alter_column("product_reviews", "id", server_default=sa.text("uuidv7()"))
    op.alter_column("recipes", "id", server_default=sa.text("uuidv7()"))
    op.alter_column("order_items", "id", server_default=sa.text("uuidv7()"))
    op.alter_column("order_history", "id", server_default=sa.text("uuidv7()"))


def downgrade() -> None:
    op.drop_constraint("order_history_order_id_fkey", "order_history", type_="foreignkey")
    op.drop_constraint("order_items_order_id_fkey", "order_items", type_="foreignkey")
    op.drop_constraint("categories_parent_id_fkey", "categories", type_="foreignkey")
    # Drop child tables
    op.drop_table("order_history")
    op.drop_table("order_items")

    # Drop new columns from orders
    op.drop_column("orders", "payment_note")
    op.drop_column("orders", "admin_note")
    op.drop_column("orders", "postal_code")
    op.drop_column("orders", "state")
    op.drop_column("orders", "city")
    op.drop_column("orders", "address_line")
    op.drop_column("orders", "item_count")
    op.drop_column("orders", "shipping_note")
    op.drop_column("orders", "country_code")
    op.drop_column("orders", "delivery_mode")
    op.drop_column("orders", "coupon_label")
    op.drop_column("orders", "coupon_code")
    op.drop_column("orders", "discount_amount")
    op.drop_column("orders", "shipping_amount")
    op.drop_column("orders", "subtotal")
    op.drop_column("orders", "payment_status")
    op.drop_column("orders", "customer_name")

    # Re-create order_data JSON column
    op.add_column("orders", sa.Column("order_data", sa.JSON(), nullable=True))

    # Drop indexes
    op.drop_index("ix_order_history_order_id", table_name="order_history")
    op.drop_index("ix_order_items_order_id", table_name="order_items")
    op.drop_index("ix_product_reviews_product_id", table_name="product_reviews")
    op.drop_index("ix_product_variants_product_id", table_name="product_variants")

    # Drop FK constraints
    op.drop_constraint("product_reviews_product_id_fkey", "product_reviews", type_="foreignkey")
    op.drop_constraint("product_variants_product_id_fkey", "product_variants", type_="foreignkey")

    # Drop PK constraints
    op.drop_constraint("recipes_pkey", "recipes", type_="primary")
    op.drop_constraint("product_reviews_pkey", "product_reviews", type_="primary")
    op.drop_constraint("coupons_pkey", "coupons", type_="primary")
    op.drop_constraint("orders_pkey", "orders", type_="primary")
    op.drop_constraint("admin_integration_settings_pkey", "admin_integration_settings", type_="primary")
    op.drop_constraint("admin_users_pkey", "admin_users", type_="primary")
    op.drop_constraint("product_variants_pkey", "product_variants", type_="primary")
    op.drop_constraint("products_pkey", "products", type_="primary")
    op.drop_constraint("categories_pkey", "categories", type_="primary")

    # Drop UUID columns
    op.drop_column("recipes", "id")
    op.drop_column("product_reviews", "product_id")
    op.drop_column("product_reviews", "id")
    op.drop_column("coupons", "id")
    op.drop_column("orders", "id")
    op.drop_column("admin_integration_settings", "id")
    op.drop_column("admin_users", "id")
    op.drop_column("product_variants", "product_id")
    op.drop_column("product_variants", "id")
    op.drop_column("products", "id")
    op.drop_column("categories", "id")
    op.drop_column("categories", "parent_id")

    # Re-create integer columns
    op.add_column("categories", sa.Column("id", sa.Integer(), primary_key=True, nullable=False))
    op.add_column("categories", sa.Column("parent_id", sa.Integer(), nullable=True))
    op.add_column("products", sa.Column("id", sa.Integer(), primary_key=True, nullable=False))
    op.add_column("product_variants", sa.Column("id", sa.Integer(), primary_key=True, nullable=False))
    op.add_column("product_variants", sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False))
    op.add_column("admin_users", sa.Column("id", sa.Integer(), primary_key=True, nullable=False))
    op.add_column("admin_integration_settings", sa.Column("id", sa.Integer(), primary_key=True, nullable=False))
    op.add_column("orders", sa.Column("id", sa.Integer(), primary_key=True))
    op.add_column("coupons", sa.Column("id", sa.Integer(), primary_key=True))
    op.add_column("product_reviews", sa.Column("id", sa.Integer(), primary_key=True))
    op.add_column("product_reviews", sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False))
    op.add_column("recipes", sa.Column("id", sa.Integer(), primary_key=True))

    # Re-create indexes
    op.create_index("ix_product_variants_product_id", "product_variants", ["product_id"])
    op.create_index("ix_product_reviews_product_id", "product_reviews", ["product_id"])

    # Convert ARRAY columns back to JSON
    op.alter_column("recipes", "steps", type_=sa.JSON(), postgresql_using="to_jsonb(steps)")
    op.alter_column("recipes", "ingredients", type_=sa.JSON(), postgresql_using="to_jsonb(ingredients)")
    op.alter_column("coupons", "eligible_terms", type_=sa.JSON(), postgresql_using="to_jsonb(eligible_terms)")
    op.alter_column("products", "images", type_=sa.JSON(), postgresql_using="to_jsonb(images)")
    op.alter_column("products", "categories", type_=sa.JSON(), postgresql_using="to_jsonb(categories)")
    op.alter_column("products", "ingredients", type_=sa.JSON(), postgresql_using="to_jsonb(ingredients)")
    op.alter_column("products", "net_weight_options", type_=sa.JSON(), postgresql_using="to_jsonb(net_weight_options)")
