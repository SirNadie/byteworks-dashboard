"""Check current enum values in database."""
import asyncio
from sqlalchemy import text
from app.core.database import engine

async def check_enum():
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT enumlabel FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'contactstatus')
            ORDER BY enumsortorder
        """))
        values = [row[0] for row in result.fetchall()]
        print(f"Current contactstatus values: {values}")

if __name__ == "__main__":
    asyncio.run(check_enum())
