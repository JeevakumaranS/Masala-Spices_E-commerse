"""Move all notification provider settings into the database."""

import base64
import hashlib
import os
from pathlib import Path

from alembic import op
from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv
import sqlalchemy as sa


revision = "20261024_db_notifications"
down_revision = "20261023_admin_brevo_key"
branch_labels = None
depends_on = None


def _encrypt_existing_email_key() -> None:
    connection = op.get_bind()
    table = sa.table(
        "notification_settings",
        sa.column("id", sa.Integer()),
        sa.column("email_api_key", sa.Text()),
    )
    rows = connection.execute(
        sa.select(table.c.id, table.c.email_api_key)
    ).mappings().all()
    populated_rows = [row for row in rows if row["email_api_key"]]
    if not populated_rows:
        return

    repository_root = Path(__file__).resolve().parents[3]
    load_dotenv(repository_root / ".env", override=False)
    load_dotenv(repository_root / "backend" / ".env", override=False)
    secret = os.getenv("ADMIN_TOKEN_SECRET", "")
    if len(secret) < 32:
        raise RuntimeError(
            "ADMIN_TOKEN_SECRET (at least 32 characters) is required to encrypt "
            "the existing Brevo API key."
        )
    key_material = hashlib.sha256(
        b"masala-notification-settings:" + secret.encode("utf-8")
    ).digest()
    cipher = Fernet(base64.urlsafe_b64encode(key_material))

    for row in populated_rows:
        encrypted = cipher.encrypt(row["email_api_key"].encode("utf-8")).decode("ascii")
        connection.execute(
            table.update()
            .where(table.c.id == row["id"])
            .values(email_api_key=encrypted)
        )


def _decrypt_existing_email_key() -> None:
    connection = op.get_bind()
    table = sa.table(
        "notification_settings",
        sa.column("id", sa.Integer()),
        sa.column("email_api_key_encrypted", sa.Text()),
    )
    rows = connection.execute(
        sa.select(table.c.id, table.c.email_api_key_encrypted)
    ).mappings().all()
    populated_rows = [row for row in rows if row["email_api_key_encrypted"]]
    if not populated_rows:
        return

    repository_root = Path(__file__).resolve().parents[3]
    load_dotenv(repository_root / ".env", override=False)
    load_dotenv(repository_root / "backend" / ".env", override=False)
    secret = os.getenv("ADMIN_TOKEN_SECRET", "")
    if len(secret) < 32:
        raise RuntimeError(
            "ADMIN_TOKEN_SECRET (at least 32 characters) is required to decrypt "
            "the Brevo API key during downgrade."
        )
    key_material = hashlib.sha256(
        b"masala-notification-settings:" + secret.encode("utf-8")
    ).digest()
    cipher = Fernet(base64.urlsafe_b64encode(key_material))

    for row in populated_rows:
        try:
            decrypted = cipher.decrypt(
                row["email_api_key_encrypted"].encode("ascii")
            ).decode("utf-8")
        except (InvalidToken, UnicodeError) as exc:
            raise RuntimeError(
                "Unable to decrypt the Brevo API key. Confirm the configured "
                "ADMIN_TOKEN_SECRET."
            ) from exc
        connection.execute(
            table.update()
            .where(table.c.id == row["id"])
            .values(email_api_key_encrypted=decrypted)
        )


def upgrade() -> None:
    _encrypt_existing_email_key()
    op.alter_column(
        "notification_settings",
        "email_api_key",
        new_column_name="email_api_key_encrypted",
    )
    op.add_column(
        "notification_settings",
        sa.Column("sms_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "notification_settings",
        sa.Column("sms_account_sid", sa.Text(), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("sms_auth_token_encrypted", sa.Text(), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("sms_sender_phone", sa.String(32), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "notification_settings",
        sa.Column("email_sender_name", sa.String(255), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("email_sender_email", sa.String(320), nullable=True),
    )


def downgrade() -> None:
    _decrypt_existing_email_key()
    op.drop_column("notification_settings", "email_sender_email")
    op.drop_column("notification_settings", "email_sender_name")
    op.drop_column("notification_settings", "email_enabled")
    op.drop_column("notification_settings", "sms_sender_phone")
    op.drop_column("notification_settings", "sms_auth_token_encrypted")
    op.drop_column("notification_settings", "sms_account_sid")
    op.drop_column("notification_settings", "sms_enabled")
    op.alter_column(
        "notification_settings",
        "email_api_key_encrypted",
        new_column_name="email_api_key",
    )
