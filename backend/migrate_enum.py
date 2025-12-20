"""
Migration script to add new status values to ContactStatus enum.
Run this script once to update the PostgreSQL enum.
"""

import asyncio
from sqlalchemy import text
from app.core.database import engine

async def add_enum_values():
    """Add 'drafting' and 'quoted' values to contactstatus enum."""
    
    async with engine.begin() as conn:
        # Check if values already exist first
        result = await conn.execute(text("""
            SELECT enumlabel FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'contactstatus')
        """))
        existing_values = [row[0] for row in result.fetchall()]
        print(f"Existing enum values: {existing_values}")
        
        # Add 'drafting' if not exists
        if 'drafting' not in existing_values:
            await conn.execute(text("ALTER TYPE contactstatus ADD VALUE 'drafting'"))
            print("✅ Added 'drafting' to contactstatus enum")
        else:
            print("ℹ️  'drafting' already exists")
        
        # Add 'quoted' if not exists
        if 'quoted' not in existing_values:
            await conn.execute(text("ALTER TYPE contactstatus ADD VALUE 'quoted'"))
            print("✅ Added 'quoted' to contactstatus enum")
        else:
            print("ℹ️  'quoted' already exists")
        
        print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(add_enum_values())
