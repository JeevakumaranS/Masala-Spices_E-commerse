"""Store notification credentials as plaintext in notification_settings."""

import base64
import hashlib
import os

from alembic import op
import sqlalchemy as sa
from cryptography.fernet import Fernet, InvalidToken


revision = "20261007_notify_plaintext"
down_revision = "20261006_home_uuid7"
branch_labels = None
depends_on = None


OLD_TABLE = "admin_integration_settings"
NEW_TABLE = "notification_settings"
SECRET_COLUMNS = (
    ("sms_api_key_encrypted", "sms_api_key"),
    ("sms_account_sid_encrypted", "sms_account_sid"),
    ("email_api_key_encrypted", "email_api_key"),
)


def _cipher_for_existing_credentials() -> Fernet | None:
    secret = os.getenv("ADMIN_TOKEN_SECRET", "")
    if len(secret) < 32:
        return None
    key_material = hashlib.sha256(
        b"masala-admin-integration-settings:" + secret.encode("utf-8")
    ).digest()
    return Fernet(base64.urlsafe_b64encode(key_material))


def _transform_existing_credentials(*, decrypt: bool) -> None:
    connection = op.get_bind()
    old_columns = [old_name for old_name, _ in SECRET_COLUMNS]
    new_columns = [new_name for _, new_name in SECRET_COLUMNS]
    source_columns = old_columns if decrypt else new_columns
    table = sa.table(
        OLD_TABLE if decrypt else NEW_TABLE,
        sa.column("id", sa.Uuid()),
        *(sa.column(column, sa.Text()) for column in source_columns),
    )
    rows = connection.execute(
        sa.select(table.c.id, *(table.c[column] for column in source_columns))
    ).mappings().all()
    if not rows:
        return

    has_credentials = any(row[column] for row in rows for column in source_columns)
    cipher = _cipher_for_existing_credentials()
    if has_credentials and cipher is None:
        raise RuntimeError(
            "ADMIN_TOKEN_SECRET (at least 32 characters) is required to migrate "
            "the existing notification credentials."
        )

    transformed_rows: list[tuple[object, dict[str, str | None]]] = []
    for row in rows:
        values: dict[str, str | None] = {}
        for source in source_columns:
            value = row[source]
            if value and cipher is not None:
                try:
                    token = value.encode("ascii")
                    value = (
                        cipher.decrypt(token).decode("utf-8")
                        if decrypt
                        else cipher.encrypt(value.encode("utf-8")).decode("ascii")
                    )
                except (InvalidToken, UnicodeError) as exc:
                    action = "decrypt" if decrypt else "encrypt"
                    raise RuntimeError(
                        f"Unable to {action} an existing notification credential. "
                        "Confirm the configured ADMIN_TOKEN_SECRET."
                    ) from exc
            values[source] = value
        transformed_rows.append((row["id"], values))

    for row_id, values in transformed_rows:
        connection.execute(
            sa.update(table)
            .where(table.c.id == row_id)
            .values(**values)
        )


def upgrade() -> None:
    _transform_existing_credentials(decrypt=True)
    op.rename_table(OLD_TABLE, NEW_TABLE)
    for old_name, new_name in SECRET_COLUMNS:
        op.alter_column(NEW_TABLE, old_name, new_column_name=new_name)


def downgrade() -> None:
    _transform_existing_credentials(decrypt=False)
    for old_name, new_name in SECRET_COLUMNS:
        op.alter_column(NEW_TABLE, new_name, new_column_name=old_name)
    op.rename_table(NEW_TABLE, OLD_TABLE)
