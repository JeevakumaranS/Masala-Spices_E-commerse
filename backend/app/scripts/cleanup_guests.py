"""Delete inactive anonymous guests that have never placed an order."""

from sqlalchemy import text

from app.core.database import engine


async def main() -> None:
    async with engine.begin() as connection:
        result = await connection.execute(text("""
            DELETE FROM guest_sessions AS guest
            WHERE guest.last_seen_at < now() - interval '90 days'
              AND NOT EXISTS (
                  SELECT 1 FROM orders
                  WHERE orders.guest_id = guest.guest_id
              )
        """))
        print(f"Deleted {result.rowcount or 0} inactive guest session(s).")
    await engine.dispose()


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
