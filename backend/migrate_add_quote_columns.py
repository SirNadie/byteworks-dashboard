"""
Migration script to add missing columns to quotes table.
The table exists but with a different schema than the new model.
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
        # List of columns to add to quotes table
        columns_to_add = [
            ("client_name", "VARCHAR(100) NOT NULL DEFAULT 'Unknown'"),
            ("client_email", "VARCHAR(255) NOT NULL DEFAULT 'unknown@example.com'"),
            ("client_phone", "VARCHAR(50)"),
            ("client_company", "VARCHAR(100)"),
            ("currency", "VARCHAR(3) NOT NULL DEFAULT 'USD'"),
            ("subtotal", "NUMERIC(12, 2) NOT NULL DEFAULT 0"),
            ("discount", "NUMERIC(12, 2) NOT NULL DEFAULT 0"),
            ("tax", "NUMERIC(12, 2) NOT NULL DEFAULT 0"),
            ("total", "NUMERIC(12, 2) NOT NULL DEFAULT 0"),
            ("valid_until", "DATE"),
            ("notes", "TEXT"),
            ("reminder_sent", "BOOLEAN NOT NULL DEFAULT false"),
            ("sent_at", "TIMESTAMP WITH TIME ZONE"),
        ]
        
        for col_name, col_def in columns_to_add:
            if not column_exists(conn, "quotes", col_name):
                print(f"Adding {col_name} column to quotes table...")
                conn.execute(text(f"ALTER TABLE quotes ADD COLUMN {col_name} {col_def}"))
                print(f"✅ {col_name} column added")
            else:
                print(f"ℹ️ {col_name} column already exists")
        
        # Check if quote_number column exists
        if not column_exists(conn, "quotes", "quote_number"):
            print("Adding quote_number column to quotes table...")
            conn.execute(text("""
                ALTER TABLE quotes ADD COLUMN quote_number VARCHAR(50) UNIQUE
            """))
            # Generate quote numbers for existing rows
            conn.execute(text("""
                UPDATE quotes SET quote_number = 'QT-' || LPAD(CAST(EXTRACT(EPOCH FROM created_at) AS TEXT), 10, '0')
                WHERE quote_number IS NULL
            """))
            conn.execute(text("""
                ALTER TABLE quotes ALTER COLUMN quote_number SET NOT NULL
            """))
            print("✅ quote_number column added")
        else:
            print("ℹ️ quote_number column already exists")
        
        # Check if status column exists and has correct type
        if not column_exists(conn, "quotes", "status"):
            print("Adding status column to quotes table...")
            conn.execute(text("""
                ALTER TABLE quotes ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft'
            """))
            print("✅ status column added")
        else:
            print("ℹ️ status column already exists")
        
        # Add created_at and updated_at if missing
        if not column_exists(conn, "quotes", "created_at"):
            print("Adding created_at column...")
            conn.execute(text("""
                ALTER TABLE quotes ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            """))
            print("✅ created_at column added")
        
        if not column_exists(conn, "quotes", "updated_at"):
            print("Adding updated_at column...")
            conn.execute(text("""
                ALTER TABLE quotes ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            """))
            print("✅ updated_at column added")
        
        # Make valid_until NOT NULL with a default
        try:
            conn.execute(text("""
                UPDATE quotes SET valid_until = CURRENT_DATE + INTERVAL '30 days' WHERE valid_until IS NULL
            """))
            conn.execute(text("""
                ALTER TABLE quotes ALTER COLUMN valid_until SET NOT NULL
            """))
            print("✅ valid_until set to NOT NULL")
        except Exception as e:
            print(f"ℹ️ valid_until constraint: {e}")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate()
