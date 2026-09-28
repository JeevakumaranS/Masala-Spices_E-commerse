"""Compatibility revision: catalog storage already adds the facet columns."""

revision = "20260925_catalog_facets"
down_revision = "20260925_catalog_storage"
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
