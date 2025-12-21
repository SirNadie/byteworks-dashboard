"""
Migration script to add discount_type, discount_value, and language columns to quotes table.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "")
SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

def column_exists(conn, table_name, column_name):
    result = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = :table AND column_name = :column
        )
    """), {"table": table_name, "column": column_name})
    return result.scalar()

def migrate():
    engine = create_engine(SYNC_DATABASE_URL)
    
    with engine.connect() as conn:
        # List of new columns to add
        columns_to_add = [
            ("discount_type", "VARCHAR(20) NOT NULL DEFAULT 'percentage'"),
            ("discount_value", "NUMERIC(12, 2) NOT NULL DEFAULT 0"),
            ("language", "VARCHAR(2) NOT NULL DEFAULT 'en'"),
        ]
        
        for col_name, col_def in columns_to_add:
            if not column_exists(conn, "quotes", col_name):
                print(f"Adding {col_name} column to quotes table...")
                conn.execute(text(f"ALTER TABLE quotes ADD COLUMN {col_name} {col_def}"))
                print(f"✅ {col_name} column added")
            else:
                print(f"ℹ️ {col_name} column already exists")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate()
