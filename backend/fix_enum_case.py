"""
Fix enum case mismatch - migrate all uppercase to lowercase.
"""
import asyncio
from sqlalchemy import text
from app.core.database import engine

async def fix_enum_case():
    """Migrate uppercase enum values to lowercase."""
    
    async with engine.begin() as conn:
        print("Starting enum case fix migration...")
        
        # First, update existing contacts from uppercase to lowercase
        updates = [
            ("UPDATE contacts SET status = 'new' WHERE status = 'NEW'", 'NEW -> new'),
            ("UPDATE contacts SET status = 'contacted' WHERE status = 'CONTACTED'", 'CONTACTED -> contacted'),
            ("UPDATE contacts SET status = 'qualified' WHERE status = 'QUALIFIED'", 'QUALIFIED -> qualified'),
            ("UPDATE contacts SET status = 'converted' WHERE status = 'CONVERTED'", 'CONVERTED -> converted'),
            ("UPDATE contacts SET status = 'lost' WHERE status = 'LOST'", 'LOST -> lost'),
        ]
        
        for query, desc in updates:
            result = await conn.execute(text(query))
            if result.rowcount > 0:
                print(f"  ✅ Updated {result.rowcount} rows: {desc}")
        
        # Verify
        result = await conn.execute(text("SELECT DISTINCT status FROM contacts"))
        statuses = [row[0] for row in result.fetchall()]
        print(f"\nCurrent statuses in contacts table: {statuses}")
        
        print("\n✅ Migration completed!")
        print("\nNote: The old uppercase enum values still exist in pg_enum but won't be used.")
        print("You can manually clean them up later if needed.")

if __name__ == "__main__":
    asyncio.run(fix_enum_case())
