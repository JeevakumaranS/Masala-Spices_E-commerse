"""Store notification credentials without encryption."""

import base64
import hashlib
import os
from pathlib import Path

from alembic import op
from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv
import sqlalchemy as sa


revision = "20261025_plain_notifications"
down_revision = "20261024_db_notifications"
branch_labels = None
depends_on = None


def _decrypt_existing_secrets() -> None:
    connection = op.get_bind()
    table = sa.table(
        "notification_settings",
        sa.column("id", sa.Integer()),
        sa.column("email_api_key_encrypted", sa.Text()),
        sa.column("sms_auth_token_encrypted", sa.Text()),
    )
    rows = connection.execute(
        sa.select(
            table.c.id,
            table.c.email_api_key_encrypted,
            table.c.sms_auth_token_encrypted,
        )
    ).mappings().all()
    if not any(
        row["email_api_key_encrypted"] or row["sms_auth_token_encrypted"]
        for row in rows
    ):
        return

    repository_root = Path(__file__).resolve().parents[3]
    load_dotenv(repository_root / ".env", override=False)
    load_dotenv(repository_root / "backend" / ".env", override=False)
    secret = os.getenv("ADMIN_TOKEN_SECRET", "")
    if len(secret) < 32:
        raise RuntimeError(
            "ADMIN_TOKEN_SECRET (at least 32 characters) is required to migrate "
            "encrypted notification credentials."
        )
    key_material = hashlib.sha256(
        b"masala-notification-settings:" + secret.encode("utf-8")
    ).digest()
    cipher = Fernet(base64.urlsafe_b64encode(key_material))

    for row in rows:
        values: dict[str, str | None] = {}
        for encrypted_column, plain_column in (
            ("email_api_key_encrypted", "email_api_key"),
            ("sms_auth_token_encrypted", "sms_auth_token"),
        ):
            value = row[encrypted_column]
            if value:
                try:
                    values[plain_column] = cipher.decrypt(
                        value.encode("ascii")
                    ).decode("utf-8")
                except (InvalidToken, UnicodeError) as exc:
                    raise RuntimeError(
                        "Unable to decrypt existing notification credentials. "
                        "Confirm the configured ADMIN_TOKEN_SECRET."
                    ) from exc
        if values:
            encrypted_values = {
                encrypted_column: values[plain_column]
                for encrypted_column, plain_column in (
                    ("email_api_key_encrypted", "email_api_key"),
                    ("sms_auth_token_encrypted", "sms_auth_token"),
                )
                if plain_column in values
            }
            connection.execute(
                table.update()
                .where(table.c.id == row["id"])
                .values(**encrypted_values)
            )


def upgrade() -> None:
    _decrypt_existing_secrets()
    op.alter_column(
        "notification_settings",
        "email_api_key_encrypted",
        new_column_name="email_api_key",
    )
    op.alter_column(
        "notification_settings",
        "sms_auth_token_encrypted",
        new_column_name="sms_auth_token",
    )


def downgrade() -> None:
    connection = op.get_bind()
    table = sa.table(
        "notification_settings",
        sa.column("id", sa.Integer()),
        sa.column("email_api_key", sa.Text()),
        sa.column("sms_auth_token", sa.Text()),
    )
    rows = connection.execute(
        sa.select(table.c.id, table.c.email_api_key, table.c.sms_auth_token)
    ).mappings().all()
    if any(row["email_api_key"] or row["sms_auth_token"] for row in rows):
        repository_root = Path(__file__).resolve().parents[3]
        load_dotenv(repository_root / ".env", override=False)
        load_dotenv(repository_root / "backend" / ".env", override=False)
        secret = os.getenv("ADMIN_TOKEN_SECRET", "")
        if len(secret) < 32:
            raise RuntimeError(
                "ADMIN_TOKEN_SECRET (at least 32 characters) is required to "
                "encrypt notification credentials during downgrade."
            )
        key_material = hashlib.sha256(
            b"masala-notification-settings:" + secret.encode("utf-8")
        ).digest()
        cipher = Fernet(base64.urlsafe_b64encode(key_material))
        for row in rows:
            values = {}
            if row["email_api_key"]:
                values["email_api_key"] = cipher.encrypt(
                    row["email_api_key"].encode("utf-8")
                ).decode("ascii")
            if row["sms_auth_token"]:
                values["sms_auth_token"] = cipher.encrypt(
                    row["sms_auth_token"].encode("utf-8")
                ).decode("ascii")
            if values:
                connection.execute(
                    table.update()
                    .where(table.c.id == row["id"])
                    .values(**values)
                )
    op.alter_column(
        "notification_settings",
        "email_api_key",
        new_column_name="email_api_key_encrypted",
    )
    op.alter_column(
        "notification_settings",
        "sms_auth_token",
        new_column_name="sms_auth_token_encrypted",
    )
