"""Remove external photo URLs while retaining RustFS image references.

Revision ID: 20261018_uploaded_photos
Revises: 20261017_product_fields
"""

from alembic import op


revision = "20261018_uploaded_photos"
down_revision = "20261017_product_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("products", "combos"):
        op.execute(
            f"""
            UPDATE {table}
            SET images = COALESCE(
                ARRAY(
                    SELECT image
                    FROM unnest(COALESCE(images, ARRAY[]::text[])) AS image
                    WHERE image !~* '^https?://'
                       OR image ~* '/(masaladb|masala-store)/'
                ),
                ARRAY[]::text[]
            )
            WHERE EXISTS (
                SELECT 1
                FROM unnest(COALESCE(images, ARRAY[]::text[])) AS image
                WHERE image ~* '^https?://'
                  AND image !~* '/(masaladb|masala-store)/'
            )
            """
        )

    op.execute(
        """
        UPDATE recipes
        SET hero_image_url = ''
        WHERE hero_image_url ~* '^https?://'
          AND hero_image_url !~* '/(masaladb|masala-store)/'
        """
    )
    op.execute(
        """
        UPDATE blog_posts
        SET hero_image_url = ''
        WHERE hero_image_url ~* '^https?://'
          AND hero_image_url !~* '/(masaladb|masala-store)/'
        """
    )
    op.execute(
        """
        UPDATE homepage_settings
        SET content = jsonb_set(
            content::jsonb,
            '{categories,items}',
            COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_set(item, '{image_url}', '""'::jsonb, true)
                        ORDER BY ordinality
                    )
                    FROM jsonb_array_elements(
                        COALESCE(content::jsonb #> '{categories,items}', '[]'::jsonb)
                    ) WITH ORDINALITY AS category(item, ordinality)
                ),
                '[]'::jsonb
            ),
            true
        )::json
        WHERE jsonb_typeof(content::jsonb #> '{categories,items}') = 'array'
        """
    )


def downgrade() -> None:
    pass
