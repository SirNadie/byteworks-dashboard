"""
Notion API service for syncing CRM data.
Creates and updates pages in Notion databases for Leads, Clients, Quotes, Invoices, and Payments.
"""

import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime, date

from ..core.config import settings


class NotionClient:
    """Client for interacting with Notion API."""
    
    BASE_URL = "https://api.notion.com/v1"
    
    def __init__(self):
        self.token = settings.notion_token
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
        }
        
        # Database IDs
        self.leads_db_id = settings.notion_leads_db_id
        self.clients_db_id = settings.notion_clients_db_id
        self.quotes_db_id = settings.notion_quotes_db_id
        self.invoices_db_id = settings.notion_invoices_db_id
        self.payments_db_id = settings.notion_payments_db_id
    
    def is_configured(self) -> bool:
        """Check if Notion is properly configured."""
        return bool(self.token and self.leads_db_id)
    
    async def _request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Optional[Dict]:
        """Make a request to Notion API."""
        if not self.is_configured():
            print("⚠️ Notion not configured, skipping...")
            return None
            
        url = f"{self.BASE_URL}{endpoint}"
        
        try:
            async with httpx.AsyncClient() as client:
                if method == "POST":
                    response = await client.post(url, headers=self.headers, json=data, timeout=30.0)
                elif method == "PATCH":
                    response = await client.patch(url, headers=self.headers, json=data, timeout=30.0)
                elif method == "GET":
                    response = await client.get(url, headers=self.headers, timeout=30.0)
                else:
                    return None
                
                if response.status_code in [200, 201]:
                    return response.json()
                else:
                    print(f"❌ Notion API error: {response.status_code} - {response.text}")
                    return None
        except Exception as e:
            print(f"❌ Notion request failed: {e}")
            return None
    
    async def delete_page(self, page_id: str) -> bool:
        """Archive (delete) a page in Notion."""
        data = {"archived": True}
        result = await self._request("PATCH", f"/pages/{page_id}", data)
        return result is not None
    
    # ==================== HELPER METHODS ====================
    
    def _text_property(self, value: str) -> Dict:
        """Create a rich text property."""
        return {"rich_text": [{"text": {"content": value or ""}}]}
    
    def _title_property(self, value: str) -> Dict:
        """Create a title property."""
        return {"title": [{"text": {"content": value or ""}}]}
    
    def _email_property(self, value: str) -> Dict:
        """Create an email property."""
        return {"email": value if value else None}
    
    def _phone_property(self, value: str) -> Dict:
        """Create a phone property."""
        return {"phone_number": value if value else None}
    
    def _number_property(self, value: float) -> Dict:
        """Create a number property."""
        return {"number": value if value is not None else None}
    
    def _select_property(self, value: str) -> Dict:
        """Create a select property."""
        return {"select": {"name": value} if value else None}
    
    def _url_property(self, value: str) -> Dict:
        """Create a URL property."""
        return {"url": value if value else None}
    
    def _date_property(self, value: Any) -> Dict:
        """Create a date property."""
        if value is None:
            return {"date": None}
        if isinstance(value, (datetime, date)):
            return {"date": {"start": value.isoformat()}}
        return {"date": {"start": str(value)}}
    
    def _relation_property(self, page_ids: List[str]) -> Dict:
        """Create a relation property."""
        return {"relation": [{"id": pid} for pid in page_ids if pid]}
    
    # ==================== LEADS ====================
    
    async def create_lead(
        self,
        name: str,
        email: str,
        phone: Optional[str] = None,
        company: Optional[str] = None,
        message: Optional[str] = None,
        source: str = "Website",
        contact_method: str = "Email",
        crm_id: Optional[int] = None
    ) -> Optional[str]:
        """Create a new lead in Notion. Returns the page ID."""
        
        properties = {
            "Name": self._title_property(name),
            "Email": self._email_property(email),
            "Phone": self._phone_property(phone),
            "Company": self._text_property(company or ""),
            "Message": self._text_property(message[:2000] if message else ""),
            "Status": self._select_property("New"),
            "Source": self._select_property(source),
            "Contact Method": self._select_property(contact_method),
        }
        
        if crm_id:
            properties["CRM ID"] = self._number_property(crm_id)
        
        data = {
            "parent": {"database_id": self.leads_db_id},
            "properties": properties
        }
        
        result = await self._request("POST", "/pages", data)
        
        if result:
            page_id = result.get("id")
            print(f"✅ Created lead in Notion: {name} (ID: {page_id})")
            return page_id
        return None
    
    async def find_lead_by_email(self, email: str) -> Optional[str]:
        """Find a lead page ID by email."""
        data = {
            "filter": {
                "property": "Email",
                "email": {
                    "equals": email
                }
            }
        }
        result = await self._request("POST", f"/databases/{self.leads_db_id}/query", data)
        
        if result and result.get("results"):
            return result["results"][0]["id"]
        return None
    
    async def update_lead_status(self, page_id: str, status: str) -> bool:
        """Update lead status in Notion."""
        data = {
            "properties": {
                "Status": self._select_property(status)
            }
        }
        result = await self._request("PATCH", f"/pages/{page_id}", data)
        return result is not None
    
    # ==================== CLIENTS ====================
    
    async def create_client(
        self,
        name: str,
        contact_name: Optional[str] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        company: Optional[str] = None,
        google_drive_link: Optional[str] = None,
        crm_id: Optional[int] = None
    ) -> Optional[str]:
        """Create a new client in Notion. Returns the page ID."""
        
        properties = {
            "Name": self._title_property(name),
            "Contact Name": self._text_property(contact_name or ""),
            "Email": self._email_property(email),
            "Phone": self._phone_property(phone),
            "Company": self._text_property(company or ""),
            "Status": self._select_property("Active"),
        }
        
        if google_drive_link:
            properties["Google Drive"] = self._url_property(google_drive_link)
        
        if crm_id:
            properties["CRM ID"] = self._number_property(crm_id)
        
        data = {
            "parent": {"database_id": self.clients_db_id},
            "properties": properties
        }
        
        result = await self._request("POST", "/pages", data)
        
        if result:
            page_id = result.get("id")
            print(f"✅ Created client in Notion: {name} (ID: {page_id})")
            return page_id
        return None
    
    async def update_client_drive_link(self, page_id: str, drive_link: str) -> bool:
        """Update client's Google Drive link."""
        data = {
            "properties": {
                "Google Drive": self._url_property(drive_link)
            }
        }
        result = await self._request("PATCH", f"/pages/{page_id}", data)
        return result is not None
    
    # ==================== QUOTES ====================
    
    async def create_quote(
        self,
        quote_number: str,
        total: float,
        currency: str = "USD",
        status: str = "Draft",
        valid_until: Optional[date] = None,
        pdf_link: Optional[str] = None,
        client_notion_id: Optional[str] = None,
        crm_id: Optional[int] = None
    ) -> Optional[str]:
        """Create a new quote in Notion. Returns the page ID."""
        
        properties = {
            "Name": self._title_property(quote_number),  # Title property
            "Quote Number": self._text_property(quote_number),
            "Total": self._number_property(total),
            "Currency": self._select_property(currency),
            "Status": self._select_property(status),
        }
        
        if valid_until:
            properties["Valid Until"] = self._date_property(valid_until)
        
        if pdf_link:
            properties["PDF Link"] = self._url_property(pdf_link)
        
        if client_notion_id:
            properties["Client Name"] = self._text_property(client_notion_id or "")
        
        if crm_id:
            properties["CRM ID"] = self._number_property(crm_id)
        
        data = {
            "parent": {"database_id": self.quotes_db_id},
            "properties": properties
        }
        
        result = await self._request("POST", "/pages", data)
        
        if result:
            page_id = result.get("id")
            print(f"✅ Created quote in Notion: {quote_number} (ID: {page_id})")
            return page_id
        return None
    
    async def update_quote_status(self, page_id: str, status: str) -> bool:
        """Update quote status in Notion."""
        data = {
            "properties": {
                "Status": self._select_property(status)
            }
        }
        result = await self._request("PATCH", f"/pages/{page_id}", data)
        return result is not None
    
    # ==================== INVOICES ====================
    
    async def create_invoice(
        self,
        invoice_number: str,
        total: float,
        currency: str = "USD",
        status: str = "Pending",
        due_date: Optional[date] = None,
        pdf_link: Optional[str] = None,
        client_notion_id: Optional[str] = None,
        quote_notion_id: Optional[str] = None,
        crm_id: Optional[int] = None
    ) -> Optional[str]:
        """Create a new invoice in Notion. Returns the page ID."""
        
        properties = {
            "Name": self._title_property(invoice_number),  # Title property
            "Invoice Number": self._text_property(invoice_number),
            "Total": self._number_property(total),
            "Currency": self._select_property(currency),
            "Status": self._select_property(status),
        }
        
        if due_date:
            properties["Due Date"] = self._date_property(due_date)
        
        if pdf_link:
            properties["PDF Link"] = self._url_property(pdf_link)
        
        # Note: Relations (Client, Quote) removed - they require manual DB linking in Notion
        # Instead, we store the reference as text if needed
        # if client_notion_id:
        #     properties["Client"] = self._relation_property([client_notion_id])
        # if quote_notion_id:
        #     properties["Quote"] = self._relation_property([quote_notion_id])
        
        if crm_id:
            properties["CRM ID"] = self._number_property(crm_id)
        
        data = {
            "parent": {"database_id": self.invoices_db_id},
            "properties": properties
        }
        
        result = await self._request("POST", "/pages", data)
        
        if result:
            page_id = result.get("id")
            print(f"✅ Created invoice in Notion: {invoice_number} (ID: {page_id})")
            return page_id
        return None
    
    async def update_invoice_status(self, page_id: str, status: str, paid_date: Optional[date] = None) -> bool:
        """Update invoice status in Notion."""
        properties = {
            "Status": self._select_property(status)
        }
        if paid_date:
            properties["Paid Date"] = self._date_property(paid_date)
        
        data = {"properties": properties}
        result = await self._request("PATCH", f"/pages/{page_id}", data)
        return result is not None
    
    # ==================== PAYMENTS ====================
    
    async def create_payment(
        self,
        amount: float,
        currency: str = "USD",
        method: str = "Transfer",
        payment_date: Optional[date] = None,
        receipt_link: Optional[str] = None,
        notes: Optional[str] = None,
        client_notion_id: Optional[str] = None,
        invoice_notion_id: Optional[str] = None,
        invoice_number: Optional[str] = None,
        crm_id: Optional[int] = None
    ) -> Optional[str]:
        """Create a new payment record in Notion. Returns the page ID."""
        
        currency_symbol = "$" if currency == "USD" else "TT$"
        # Format: "INV-XXXX - $XX.XX" or "$XX.XX - Method" if no invoice number
        if invoice_number:
            title = f"{invoice_number} - {currency_symbol}{amount:,.2f}"
        else:
            title = f"{currency_symbol}{amount:,.2f} - {method}"
        
        properties = {
            "Name": self._title_property(title),  # Title property
            "Amount": self._number_property(amount),
            "Currency": self._select_property(currency),
            "Method": self._select_property(method),
        }
        
        if payment_date:
            properties["Date"] = self._date_property(payment_date)
        
        if receipt_link:
            properties["Receipt Link"] = self._url_property(receipt_link)
        
        if notes:
            properties["Notes"] = self._text_property(notes)
        
        # Note: Relations (Client, Invoice) removed - they require manual DB linking in Notion
        # if client_notion_id:
        #     properties["Client"] = self._relation_property([client_notion_id])
        # if invoice_notion_id:
        #     properties["Invoice"] = self._relation_property([invoice_notion_id])
        
        if crm_id:
            properties["CRM ID"] = self._number_property(crm_id)
        
        data = {
            "parent": {"database_id": self.payments_db_id},
            "properties": properties
        }
        
        result = await self._request("POST", "/pages", data)
        
        if result:
            page_id = result.get("id")
            print(f"✅ Created payment in Notion: {title} (ID: {page_id})")
            return page_id
        return None


# Global client instance
notion_client = NotionClient()


# ==================== CONVENIENCE FUNCTIONS ====================

async def create_lead_in_notion(
    name: str,
    email: str,
    phone: Optional[str] = None,
    company: Optional[str] = None,
    message: Optional[str] = None,
    source: str = "Website",
    contact_method: str = "Email",
    crm_id: Optional[int] = None
) -> Optional[str]:
    """Convenience function to create a lead."""
    return await notion_client.create_lead(
        name=name,
        email=email,
        phone=phone,
        company=company,
        message=message,
        source=source,
        contact_method=contact_method,
        crm_id=crm_id
    )


async def create_client_in_notion(
    name: str,
    contact_name: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    company: Optional[str] = None,
    google_drive_link: Optional[str] = None,
    crm_id: Optional[int] = None
) -> Optional[str]:
    """Convenience function to create a client."""
    return await notion_client.create_client(
        name=name,
        contact_name=contact_name,
        email=email,
        phone=phone,
        company=company,
        google_drive_link=google_drive_link,
        crm_id=crm_id
    )


async def create_quote_in_notion(
    quote_number: str,
    total: float,
    currency: str = "USD",
    status: str = "Draft",
    valid_until: Optional[date] = None,
    pdf_link: Optional[str] = None,
    client_notion_id: Optional[str] = None,
    crm_id: Optional[int] = None
) -> Optional[str]:
    """Convenience function to create a quote."""
    return await notion_client.create_quote(
        quote_number=quote_number,
        total=total,
        currency=currency,
        status=status,
        valid_until=valid_until,
        pdf_link=pdf_link,
        client_notion_id=client_notion_id,
        crm_id=crm_id
    )


async def create_invoice_in_notion(
    invoice_number: str,
    total: float,
    currency: str = "USD",
    status: str = "Pending",
    due_date: Optional[date] = None,
    pdf_link: Optional[str] = None,
    client_notion_id: Optional[str] = None,
    quote_notion_id: Optional[str] = None,
    crm_id: Optional[int] = None
) -> Optional[str]:
    """Convenience function to create an invoice."""
    return await notion_client.create_invoice(
        invoice_number=invoice_number,
        total=total,
        currency=currency,
        status=status,
        due_date=due_date,
        pdf_link=pdf_link,
        client_notion_id=client_notion_id,
        quote_notion_id=quote_notion_id,
        crm_id=crm_id
    )


async def create_payment_in_notion(
    amount: float,
    currency: str = "USD",
    method: str = "Transfer",
    payment_date: Optional[date] = None,
    receipt_link: Optional[str] = None,
    notes: Optional[str] = None,
    client_notion_id: Optional[str] = None,
    invoice_notion_id: Optional[str] = None,
    invoice_number: Optional[str] = None,
    crm_id: Optional[int] = None
) -> Optional[str]:
    """Convenience function to create a payment."""
    return await notion_client.create_payment(
        amount=amount,
        currency=currency,
        method=method,
        payment_date=payment_date,
        receipt_link=receipt_link,
        notes=notes,
        client_notion_id=client_notion_id,
        invoice_notion_id=invoice_notion_id,
        invoice_number=invoice_number,
        crm_id=crm_id
    )


async def delete_notion_page(page_id: str) -> bool:
    """Convenience function to delete (archive) a page."""
    return await notion_client.delete_page(page_id)
