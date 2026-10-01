"""Remove unused homepage hero text from stored settings."""

from alembic import op
import sqlalchemy as sa


revision = "20261004_rm_home_hero_text"
down_revision = "20261003_newsletter_updates"
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
        if isinstance(content, dict) and "hero" in content:
            updated_content = dict(content)
            updated_content.pop("hero")
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
        if isinstance(content, dict) and "hero" not in content:
            updated_content = dict(content)
            updated_content["hero"] = {"title": "", "description": ""}
            connection.execute(
                sa.update(homepage_settings)
                .where(homepage_settings.c.id == row["id"])
                .values(content=updated_content)
            )
