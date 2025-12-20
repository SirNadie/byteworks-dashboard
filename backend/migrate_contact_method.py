"""
Migration script to add contact_method enum and column to contacts table.
Run this once to update the database schema.
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

# Get database URL and convert for sync
DATABASE_URL = os.getenv("DATABASE_URL", "")
SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

def migrate():
    engine = create_engine(SYNC_DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if enum exists
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM pg_type WHERE typname = 'contactmethod'
            )
        """))
        enum_exists = result.scalar()
        
        if not enum_exists:
            print("Creating contactmethod enum...")
            conn.execute(text("""
                CREATE TYPE contactmethod AS ENUM ('whatsapp', 'email')
            """))
            print("✅ contactmethod enum created")
        else:
            print("ℹ️ contactmethod enum already exists")
        
        # Check if column exists
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'contacts' AND column_name = 'contact_method'
            )
        """))
        column_exists = result.scalar()
        
        if not column_exists:
            print("Adding contact_method column to contacts table...")
            conn.execute(text("""
                ALTER TABLE contacts 
                ADD COLUMN contact_method contactmethod NULL
            """))
            print("✅ contact_method column added")
        else:
            print("ℹ️ contact_method column already exists")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate()
