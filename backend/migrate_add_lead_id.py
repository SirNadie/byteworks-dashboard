"""
Migration script to add lead_id column to quotes table.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "")
SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

def migrate():
    engine = create_engine(SYNC_DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if lead_id column exists in quotes table
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'quotes' AND column_name = 'lead_id'
            )
        """))
        lead_id_exists = result.scalar()
        
        if not lead_id_exists:
            print("Adding lead_id column to quotes table...")
            conn.execute(text("""
                ALTER TABLE quotes 
                ADD COLUMN lead_id UUID REFERENCES contacts(id) ON DELETE SET NULL
            """))
            print("✅ lead_id column added to quotes table")
        else:
            print("ℹ️ lead_id column already exists in quotes table")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate()
