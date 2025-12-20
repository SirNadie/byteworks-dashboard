"""Check current contact statuses in database."""
import asyncio
from sqlalchemy import text
from app.core.database import engine

async def check_contacts():
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT id, name, status FROM contacts"))
        rows = result.fetchall()
        for row in rows:
            print(f"  {row[1]}: status = '{row[2]}'")

if __name__ == "__main__":
    asyncio.run(check_contacts())
