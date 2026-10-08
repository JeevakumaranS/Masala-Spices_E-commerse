"""Database-backed notification provider settings."""

from dataclasses import dataclass
import os

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import notification_settings_table


@dataclass(frozen=True)
class NotificationSettings:
    sms_enabled: bool
    sms_account_sid: str
    sms_auth_token: str
    sms_sender_phone: str
    google_apps_script_url: str = ""
    email_sender_email: str = ""

    @property
    def sms_configured(self) -> bool:
        return all((self.sms_account_sid, self.sms_auth_token, self.sms_sender_phone))

    def admin_response(self) -> dict[str, bool | str]:
        return {
            "sms_enabled": self.sms_enabled,
            "sms_configured": self.sms_configured,
            "sms_account_sid": self.sms_account_sid,
            "sms_auth_token": self.sms_auth_token,
            "sms_sender_phone": self.sms_sender_phone,
            "sms_account_sid_configured": bool(self.sms_account_sid),
            "google_apps_script_url": self.google_apps_script_url,
            "email_sender_email": self.email_sender_email,
        }


async def get_notification_settings(db: AsyncSession) -> NotificationSettings:
    result = await db.execute(
        select(notification_settings_table)
        .where(notification_settings_table.c.id == 1)
    )
    row = result.mappings().first()
    if row is None:
        return NotificationSettings(
            sms_enabled=False,
            sms_account_sid="",
            sms_auth_token="",
            sms_sender_phone="",
            google_apps_script_url=os.getenv("GOOGLE_APPS_SCRIPT_URL", "").strip(),
            email_sender_email="",
        )
    return NotificationSettings(
        sms_enabled=row["sms_enabled"],
        sms_account_sid=row["sms_account_sid"] or "",
        sms_auth_token=row["sms_auth_token"] or "",
        sms_sender_phone=row["sms_sender_phone"] or "",
        google_apps_script_url=(
            row["google_apps_script_url"]
            or os.getenv("GOOGLE_APPS_SCRIPT_URL", "").strip()
        ),
        email_sender_email=row["email_sender_email"] or "",
    )
