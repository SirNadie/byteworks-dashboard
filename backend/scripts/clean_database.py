"""
Script to clean the database and Notion while preserving user accounts.
Run this before deployment to start with a fresh database.

Usage: cd backend && .\venv\Scripts\python.exe scripts\clean_database.py
"""

import asyncio
import os
import sys
import httpx

# Ensure we can import from app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text


async def clean_notion_database(db_id: str, db_name: str, token: str) -> int:
    """Delete all pages from a Notion database."""
    if not db_id or not token:
        return 0
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
    }
    
    deleted_count = 0
    
    async with httpx.AsyncClient() as client:
        # Query all pages in database
        query_url = f"https://api.notion.com/v1/databases/{db_id}/query"
        
        try:
            response = await client.post(query_url, headers=headers, json={}, timeout=30.0)
            if response.status_code != 200:
                print(f"   ⚠️ Could not query {db_name}: {response.status_code}")
                return 0
            
            pages = response.json().get("results", [])
            
            # Archive each page (Notion doesn't allow permanent deletion via API)
            for page in pages:
                page_id = page["id"]
                archive_url = f"https://api.notion.com/v1/pages/{page_id}"
                
                archive_response = await client.patch(
                    archive_url, 
                    headers=headers, 
                    json={"archived": True},
                    timeout=30.0
                )
                
                if archive_response.status_code == 200:
                    deleted_count += 1
                else:
                    print(f"   ⚠️ Failed to archive page {page_id}")
                    
        except Exception as e:
            print(f"   ⚠️ Error cleaning {db_name}: {e}")
    
    return deleted_count


async def clean_database():
    """Delete all data except users from both PostgreSQL and Notion."""
    
    # Import here to avoid issues with module loading
    from app.core.database import engine
    from app.core.config import settings
    
    print("🧹 Cleaning databases...")
    print("=" * 50)
    
    # ==================== POSTGRESQL ====================
    print("\n📊 PostgreSQL Database:")
    
    async with engine.begin() as conn:
        # Order matters due to foreign key constraints
        
        # 1. Delete invoices
        result = await conn.execute(text("DELETE FROM invoices"))
        print(f"   ✅ Deleted {result.rowcount} invoices")
        
        # 2. Delete quote items
        result = await conn.execute(text("DELETE FROM quote_items"))
        print(f"   ✅ Deleted {result.rowcount} quote items")
        
        # 3. Delete quotes
        result = await conn.execute(text("DELETE FROM quotes"))
        print(f"   ✅ Deleted {result.rowcount} quotes")
        
        # 4. Delete contacts
        result = await conn.execute(text("DELETE FROM contacts"))
        print(f"   ✅ Deleted {result.rowcount} contacts")
        
        # 5. Delete services
        result = await conn.execute(text("DELETE FROM services"))
        print(f"   ✅ Deleted {result.rowcount} services")
        
        # Show remaining users
        result = await conn.execute(text("SELECT email FROM users"))
        users = result.fetchall()
    
    # ==================== NOTION ====================
    print("\n📝 Notion Databases:")
    
    if settings.notion_token:
        # Clean each Notion database
        notion_dbs = [
            (settings.notion_leads_db_id, "Leads"),
            (settings.notion_clients_db_id, "Clients"),
            (settings.notion_quotes_db_id, "Quotes"),
            (settings.notion_invoices_db_id, "Invoices"),
            (settings.notion_payments_db_id, "Payments"),
        ]
        
        for db_id, db_name in notion_dbs:
            if db_id:
                count = await clean_notion_database(db_id, db_name, settings.notion_token)
                print(f"   ✅ Archived {count} {db_name.lower()}")
            else:
                print(f"   ⏭️ Skipped {db_name} (not configured)")
    else:
        print("   ⏭️ Notion not configured, skipping...")
    
    # ==================== SUMMARY ====================
    print("\n" + "=" * 50)
    print(f"🔐 Preserved {len(users)} user account(s):")
    for user in users:
        print(f"   - {user[0]}")
    
    print("=" * 50)
    print("✨ All databases cleaned successfully!")
    print("   Ready for production deployment.")


if __name__ == "__main__":
    asyncio.run(clean_database())
