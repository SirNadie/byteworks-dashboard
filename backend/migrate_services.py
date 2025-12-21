"""
Migration script to create the services table.
Run this once to create the table in the database.
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
        # Check if table exists
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'services'
            )
        """))
        table_exists = result.scalar()
        
        if not table_exists:
            print("Creating services table...")
            conn.execute(text("""
                CREATE TABLE services (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    default_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
                    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
                    category VARCHAR(50) NOT NULL DEFAULT 'other',
                    is_active BOOLEAN NOT NULL DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                )
            """))
            
            # Create index on name
            conn.execute(text("""
                CREATE INDEX idx_services_name ON services(name)
            """))
            
            print("✅ Services table created")
            
            # Insert some default services
            print("Inserting default services...")
            conn.execute(text("""
                INSERT INTO services (name, description, default_price, currency, category) VALUES
                ('Landing Page Website', 'Single page responsive website with modern design', 500.00, 'USD', 'web_development'),
                ('E-commerce Website', 'Full featured online store with shopping cart and payments', 1500.00, 'USD', 'web_development'),
                ('Business Website', 'Multi-page professional website for businesses', 800.00, 'USD', 'web_development'),
                ('Logo Design', 'Professional logo design with multiple concepts', 200.00, 'USD', 'design'),
                ('Brand Identity Package', 'Complete branding including logo, colors, and guidelines', 500.00, 'USD', 'design'),
                ('Social Media Management', 'Monthly social media content and management', 300.00, 'USD', 'marketing'),
                ('SEO Setup', 'Search engine optimization setup and configuration', 400.00, 'USD', 'marketing'),
                ('Website Maintenance', 'Monthly website maintenance and updates', 150.00, 'USD', 'maintenance'),
                ('Consulting Session', 'One hour consulting session', 100.00, 'USD', 'consulting')
            """))
            print("✅ Default services inserted")
        else:
            print("ℹ️ Services table already exists")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate()
