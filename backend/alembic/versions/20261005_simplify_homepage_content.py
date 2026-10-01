"""Remove unused homepage settings."""

from alembic import op
import sqlalchemy as sa


revision = "20261005_home_content"
down_revision = "20261004_rm_home_hero_text"
branch_labels = None
depends_on = None


homepage_settings = sa.table(
    "homepage_settings",
    sa.column("id", sa.Integer()),
    sa.column("content", sa.JSON()),
)


def upgrade() -> None:
    connection = op.get_bind()
    rows = connection.execute(
        sa.select(homepage_settings.c.id, homepage_settings.c.content)
    ).mappings().all()

    for row in rows:
        content = row["content"]
        if not isinstance(content, dict):
            continue

        updated_content = dict(content)
        for section, fields in {
            "bestsellers": ("description", "image_overrides"),
            "combos": ("image_overrides",),
            "recipes": ("image_overrides",),
        }.items():
            section_content = updated_content.get(section)
            if isinstance(section_content, dict):
                section_content = dict(section_content)
                for field in fields:
                    section_content.pop(field, None)
                updated_content[section] = section_content
        updated_content.pop("cta", None)

        if updated_content != content:
            connection.execute(
                sa.update(homepage_settings)
                .where(homepage_settings.c.id == row["id"])
                .values(content=updated_content)
            )


def downgrade() -> None:
    connection = op.get_bind()
    rows = connection.execute(
        sa.select(homepage_settings.c.id, homepage_settings.c.content)
    ).mappings().all()

    for row in rows:
        content = row["content"]
        if not isinstance(content, dict):
            continue

        updated_content = dict(content)
        bestsellers = dict(updated_content.get("bestsellers") or {})
        bestsellers.setdefault("description", "")
        bestsellers.setdefault("image_overrides", [])
        updated_content["bestsellers"] = bestsellers
        for section in ("combos", "recipes"):
            section_content = dict(updated_content.get(section) or {})
            section_content.setdefault("image_overrides", [])
            updated_content[section] = section_content
        updated_content.setdefault(
            "cta",
            {
                "eyebrow": "Wholesale · Export · Gifting",
                "title": "Need masala by the case, or by the container?",
                "description": "",
                "primary_label": "Request a bulk quote",
                "primary_href": "/pages/bulk-order",
                "secondary_label": "Talk to us",
                "secondary_href": "/pages/contact",
                "links": [],
            },
        )
        connection.execute(
            sa.update(homepage_settings)
            .where(homepage_settings.c.id == row["id"])
            .values(content=updated_content)
        )
