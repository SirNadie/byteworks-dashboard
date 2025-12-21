"""
Notification service abstraction layer.
Currently uses Email, can be easily switched to WhatsApp later.

To switch to WhatsApp:
1. Create whatsapp.py service
2. Change NOTIFICATION_CHANNEL env var to "whatsapp"
3. No other code changes needed!
"""

from typing import Optional
from datetime import date

from ..core.config import settings

# Import notification methods from email service
from .email import (
    notify_new_lead as email_notify_new_lead,
    notify_new_quote as email_notify_new_quote,
    notify_payment_received as email_notify_payment_received,
    send_client_drive_link as email_send_client_drive_link,
    notify_new_invoice as email_notify_new_invoice,
)

# Import Notion methods
from .notion import (
    create_lead_in_notion,
    create_client_in_notion,
    create_quote_in_notion,
    create_invoice_in_notion,
    create_payment_in_notion,
    notion_client,
)


def get_notification_channel() -> str:
    """Get the current notification channel (email or whatsapp)."""
    return getattr(settings, 'notification_channel', 'email').lower()


# ==================== UNIFIED NOTIFICATION FUNCTIONS ====================

async def notify_new_lead(
    name: str,
    email: str,
    phone: Optional[str] = None,
    company: Optional[str] = None,
    message: Optional[str] = None,
    contact_method: str = "email",
    crm_id: Optional[int] = None
) -> dict:
    """
    Handle new lead: Create in Notion + Send notification.
    Returns dict with notion_page_id and notification_sent status.
    """
    result = {
        "notion_page_id": None,
        "notification_sent": False
    }
    
    # 1. Create in Notion
    try:
        source = "Website"  # Default source
        page_id = await create_lead_in_notion(
            name=name,
            email=email,
            phone=phone,
            company=company,
            message=message,
            source=source,
            contact_method=contact_method.capitalize() if contact_method else "Email",
            crm_id=crm_id
        )
        result["notion_page_id"] = page_id
    except Exception as e:
        print(f"❌ Failed to create lead in Notion: {e}")
    
    # 2. Send notification
    channel = get_notification_channel()
    try:
        if channel == "email":
            result["notification_sent"] = await email_notify_new_lead(
                name=name,
                email=email,
                phone=phone,
                company=company,
                message=message,
                contact_method=contact_method
            )
        elif channel == "whatsapp":
            # Future: WhatsApp notification
            # result["notification_sent"] = await whatsapp_notify_new_lead(...)
            print("⚠️ WhatsApp notifications not yet implemented, falling back to email")
            result["notification_sent"] = await email_notify_new_lead(
                name=name,
                email=email,
                phone=phone,
                company=company,
                message=message,
                contact_method=contact_method
            )
    except Exception as e:
        print(f"❌ Failed to send notification: {e}")
    
    return result


async def notify_new_quote(
    quote_number: str,
    client_name: str,
    client_email: str,
    total: float,
    currency: str,
    valid_until: str,
    client_phone: Optional[str] = None,
    client_company: Optional[str] = None,
    client_notion_id: Optional[str] = None,
    crm_id: Optional[int] = None,
    pdf_link: Optional[str] = None
) -> dict:
    """
    Handle new quote: Create in Notion + Send notification.
    """
    result = {
        "notion_page_id": None,
        "notification_sent": False
    }
    
    # 1. Create in Notion
    try:
        # Parse valid_until to date if string
        valid_date = None
        if valid_until:
            try:
                from datetime import datetime
                valid_date = datetime.strptime(valid_until, "%Y-%m-%d").date()
            except:
                valid_date = None
        
        page_id = await create_quote_in_notion(
            quote_number=quote_number,
            total=total,
            currency=currency,
            status="Sent",
            valid_until=valid_date,
            client_notion_id=client_notion_id,
            crm_id=crm_id,
            pdf_link=pdf_link
        )
        result["notion_page_id"] = page_id
    except Exception as e:
        print(f"❌ Failed to create quote in Notion: {e}")
    
    # 2. Send notification
    channel = get_notification_channel()
    try:
        if channel == "email":
            result["notification_sent"] = await email_notify_new_quote(
                quote_number=quote_number,
                client_name=client_name,
                client_email=client_email,
                client_phone=client_phone,
                client_company=client_company,
                total=total,
                currency=currency,
                valid_until=valid_until,
                pdf_link=pdf_link
            )
        elif channel == "whatsapp":
            print("⚠️ WhatsApp notifications not yet implemented, falling back to email")
            result["notification_sent"] = await email_notify_new_quote(
                quote_number=quote_number,
                client_name=client_name,
                client_email=client_email,
                client_phone=client_phone,
                client_company=client_company,
                total=total,
                currency=currency,
                valid_until=valid_until,
                pdf_link=pdf_link
            )
    except Exception as e:
        print(f"❌ Failed to send quote notification: {e}")
    
    return result


async def handle_quote_to_invoice_conversion(
    invoice_number: str,
    quote_number: str,
    client_name: str,
    client_email: str,
    client_phone: Optional[str],
    client_company: Optional[str],
    total: float,
    currency: str,
    due_date: Optional[date] = None,
    quote_notion_id: Optional[str] = None,
    invoice_crm_id: Optional[int] = None,
    client_crm_id: Optional[int] = None,
    pdf_link: Optional[str] = None
) -> dict:
    """
    Handle quote-to-invoice conversion:
    1. Create Client in Notion
    2. Create Invoice in Notion
    3. Update Quote status in Notion
    4. Send email notification
    """
    result = {
        "client_notion_id": None,
        "invoice_notion_id": None,
        "quote_updated": False,
        "notification_sent": False
    }
    
    # 1. Create Client in Notion
    try:
        client_notion_id = await create_client_in_notion(
            name=client_company or client_name,
            contact_name=client_name,
            email=client_email,
            phone=client_phone,
            company=client_company,
            crm_id=client_crm_id
        )
        result["client_notion_id"] = client_notion_id
    except Exception as e:
        print(f"❌ Failed to create client in Notion: {e}")
    
    # 2. Create Invoice in Notion
    try:
        invoice_notion_id = await create_invoice_in_notion(
            invoice_number=invoice_number,
            total=total,
            currency=currency,
            status="Pending",
            due_date=due_date,
            client_notion_id=result["client_notion_id"],
            quote_notion_id=quote_notion_id,
            crm_id=invoice_crm_id,
            pdf_link=pdf_link
        )
        result["invoice_notion_id"] = invoice_notion_id
    except Exception as e:
        print(f"❌ Failed to create invoice in Notion: {e}")
    
    # 3. Update Quote status to "Accepted"
    if quote_notion_id:
        try:
            result["quote_updated"] = await notion_client.update_quote_status(
                quote_notion_id, "Accepted"
            )
        except Exception as e:
            print(f"❌ Failed to update quote status in Notion: {e}")
            
    # 4. Send notification
    channel = get_notification_channel()
    due_date_str = due_date.strftime("%Y-%m-%d") if due_date else "N/A"
    
    try:
        if channel == "email":
            result["notification_sent"] = await email_notify_new_invoice(
                invoice_number=invoice_number,
                client_name=client_name,
                client_email=client_email,
                client_phone=client_phone,
                client_company=client_company,
                total=total,
                currency=currency,
                due_date=due_date_str,
                pdf_link=pdf_link
            )
        elif channel == "whatsapp":
             print("⚠️ WhatsApp notifications not yet implemented, falling back to email")
             result["notification_sent"] = await email_notify_new_invoice(
                invoice_number=invoice_number,
                client_name=client_name,
                client_email=client_email,
                client_phone=client_phone,
                client_company=client_company,
                total=total,
                currency=currency,
                due_date=due_date_str,
                pdf_link=pdf_link
            )
    except Exception as e:
        print(f"❌ Failed to send invoice notification: {e}")

    return result


async def handle_payment_received(
    invoice_number: str,
    client_name: str,
    amount: float,
    currency: str,
    method: str = "Transfer",
    payment_date: Optional[date] = None,
    invoice_notion_id: Optional[str] = None,
    client_notion_id: Optional[str] = None,
    invoice_crm_id: Optional[int] = None,
    receipt_link: Optional[str] = None
) -> dict:
    """
    Handle payment received:
    1. Create Payment in Notion
    2. Update Invoice status in Notion
    3. Send notification
    """
    result = {
        "payment_notion_id": None,
        "invoice_updated": False,
        "notification_sent": False
    }
    
    # 1. Create Payment in Notion
    try:
        payment_notion_id = await create_payment_in_notion(
            amount=amount,
            currency=currency,
            method=method,
            payment_date=payment_date,
            client_notion_id=client_notion_id,
            invoice_notion_id=invoice_notion_id,
            invoice_number=invoice_number,  # Pass invoice number for title format
            crm_id=invoice_crm_id,
            receipt_link=receipt_link
        )
        result["payment_notion_id"] = payment_notion_id
    except Exception as e:
        print(f"❌ Failed to create payment in Notion: {e}")
    
    # 2. Update Invoice status to "Paid"
    if invoice_notion_id:
        try:
            result["invoice_updated"] = await notion_client.update_invoice_status(
                invoice_notion_id, "Paid", payment_date
            )
        except Exception as e:
            print(f"❌ Failed to update invoice status in Notion: {e}")
    
    # 3. Send notification
    channel = get_notification_channel()
    try:
        if channel == "email":
            result["notification_sent"] = await email_notify_payment_received(
                invoice_number=invoice_number,
                client_name=client_name,
                amount=amount,
                currency=currency,
                method=method,
                receipt_link=receipt_link
            )
        elif channel == "whatsapp":
            print("⚠️ WhatsApp notifications not yet implemented, falling back to email")
            result["notification_sent"] = await email_notify_payment_received(
                invoice_number=invoice_number,
                client_name=client_name,
                amount=amount,
                currency=currency,
                method=method,
                receipt_link=receipt_link
            )
    except Exception as e:
        print(f"❌ Failed to send payment notification: {e}")
    
    return result


async def send_client_drive_folder(
    client_email: str,
    client_name: str,
    drive_link: str,
    client_notion_id: Optional[str] = None
) -> dict:
    """
    Send Google Drive folder link to client:
    1. Update client's Drive link in Notion
    2. Send email to client
    """
    result = {
        "notion_updated": False,
        "email_sent": False
    }
    
    # 1. Update Notion with Drive link
    if client_notion_id:
        try:
            result["notion_updated"] = await notion_client.update_client_drive_link(
                client_notion_id, drive_link
            )
        except Exception as e:
            print(f"❌ Failed to update client Drive link in Notion: {e}")
    
    # 2. Send email to client
    try:
        result["email_sent"] = await email_send_client_drive_link(
            client_email=client_email,
            client_name=client_name,
            drive_link=drive_link
        )
    except Exception as e:
        print(f"❌ Failed to send Drive link email to client: {e}")
    
    return result
