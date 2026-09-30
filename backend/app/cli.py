"""Command-line administration utilities."""

import argparse
import asyncio
from datetime import datetime, timezone
from getpass import getpass
import sys

from pydantic import ValidationError
from sqlalchemy import insert, select
from sqlalchemy.exc import IntegrityError

from app.core.database import admin_users_table, engine, session_factory
from app.modules.admin.auth import hash_password
from app.modules.admin.schemas import RegisterAdminRequest


class AdminAlreadyExistsError(Exception):
    """Raised when an administrator email is already registered."""


async def create_admin_account(email: str, password: str) -> str:
    account = RegisterAdminRequest(email=email, password=password)
    async with session_factory() as db:
        existing = await db.execute(
            select(admin_users_table.c.id).where(
                admin_users_table.c.email == account.email
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise AdminAlreadyExistsError("An admin account with that email already exists.")

        try:
            await db.execute(
                insert(admin_users_table).values(
                    email=account.email,
                    password_hash=hash_password(account.password),
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                )
            )
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            raise AdminAlreadyExistsError(
                "An admin account with that email already exists."
            ) from exc

    return account.email


def _format_validation_error(error: ValidationError) -> str:
    return " ".join(item["msg"] for item in error.errors(include_input=False))


async def _run_create_admin(email: str | None) -> int:
    try:
        normalized_email = email or input("Admin email: ").strip()
        password = getpass("Admin password (12–128 characters): ")
        confirmation = getpass("Confirm password: ")
        if password != confirmation:
            print("Passwords do not match.", file=sys.stderr)
            return 1

        created_email = await create_admin_account(normalized_email, password)
    except ValidationError as error:
        print(_format_validation_error(error), file=sys.stderr)
        return 1
    except AdminAlreadyExistsError as error:
        print(str(error), file=sys.stderr)
        return 1
    except (EOFError, KeyboardInterrupt):
        print("\nAdmin creation cancelled.", file=sys.stderr)
        return 130
    except Exception as error:
        print(
            f"Admin creation failed ({type(error).__name__}). "
            "Check database connectivity and apply the latest migrations.",
            file=sys.stderr,
        )
        return 1

    print(f"Admin account created for {created_email}")
    return 0


async def _main_async(email: str | None) -> int:
    try:
        return await _run_create_admin(email)
    finally:
        await engine.dispose()


def main() -> int:
    parser = argparse.ArgumentParser(description="Masala House backend administration CLI.")
    commands = parser.add_subparsers(dest="command", required=True)
    create_admin = commands.add_parser(
        "create-admin",
        help="Create an administrator account in the configured database.",
    )
    create_admin.add_argument(
        "--email",
        help="Administrator email address (prompted if omitted).",
    )
    arguments = parser.parse_args()

    try:
        return asyncio.run(_main_async(arguments.email))
    except KeyboardInterrupt:
        print("\nAdmin creation cancelled.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
