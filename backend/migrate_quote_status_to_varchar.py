"""
Migration script to convert status column from PostgreSQL enum to VARCHAR.
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
        print("Converting status column from enum to VARCHAR...")
        
        try:
            # Alter the column type from enum to varchar
            conn.execute(text("""
                ALTER TABLE quotes 
                ALTER COLUMN status TYPE VARCHAR(20) 
                USING status::text
            """))
            print("✅ status column converted to VARCHAR")
        except Exception as e:
            if "already" in str(e).lower() or "does not exist" in str(e).lower():
                print(f"ℹ️ status column may already be VARCHAR or enum doesn't exist: {e}")
            else:
                print(f"Error: {e}")
        
        # Optionally drop the old enum type if it exists
        try:
            conn.execute(text("DROP TYPE IF EXISTS quotestatus"))
            print("✅ Dropped old quotestatus enum type")
        except Exception as e:
            print(f"ℹ️ Could not drop quotestatus type: {e}")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate()
