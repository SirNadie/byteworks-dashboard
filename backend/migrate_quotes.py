"""
Migration script to create the quotes and quote_items tables.
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
        # Check if quotes table exists
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'quotes'
            )
        """))
        quotes_exists = result.scalar()
        
        if not quotes_exists:
            print("Creating quotes table...")
            conn.execute(text("""
                CREATE TABLE quotes (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    quote_number VARCHAR(50) NOT NULL UNIQUE,
                    client_name VARCHAR(100) NOT NULL,
                    client_email VARCHAR(255) NOT NULL,
                    client_phone VARCHAR(50),
                    client_company VARCHAR(100),
                    lead_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'draft',
                    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
                    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
                    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
                    tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
                    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
                    valid_until DATE NOT NULL,
                    notes TEXT,
                    reminder_sent BOOLEAN NOT NULL DEFAULT false,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    sent_at TIMESTAMP WITH TIME ZONE
                )
            """))
            conn.execute(text("CREATE INDEX idx_quotes_number ON quotes(quote_number)"))
            conn.execute(text("CREATE INDEX idx_quotes_status ON quotes(status)"))
            conn.execute(text("CREATE INDEX idx_quotes_valid_until ON quotes(valid_until)"))
            print("✅ quotes table created")
        else:
            print("ℹ️ quotes table already exists")
        
        # Check if quote_items table exists
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'quote_items'
            )
        """))
        items_exists = result.scalar()
        
        if not items_exists:
            print("Creating quote_items table...")
            conn.execute(text("""
                CREATE TABLE quote_items (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
                    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
                    description VARCHAR(500) NOT NULL,
                    quantity INTEGER NOT NULL DEFAULT 1,
                    unit_price NUMERIC(12, 2) NOT NULL,
                    total NUMERIC(12, 2) NOT NULL,
                    sort_order INTEGER NOT NULL DEFAULT 0
                )
            """))
            conn.execute(text("CREATE INDEX idx_quote_items_quote ON quote_items(quote_id)"))
            print("✅ quote_items table created")
        else:
            print("ℹ️ quote_items table already exists")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate()
