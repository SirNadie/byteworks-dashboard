"""
Quote routes for CRUD operations on quotes/estimates.
"""

from datetime import datetime, timezone, date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select, func, desc

from ..deps import DbSession, CurrentUser
from ...models.quote import Quote, QuoteStatus
from ...models.contact import Contact, ContactStatus
from ...schemas.quote import (
    QuoteCreate,
    QuoteUpdate,
    QuoteResponse,
    QuoteListResponse,
)
from ...core.config import settings

router = APIRouter()


def generate_quote_number() -> str:
    """Generate a unique quote number based on timestamp."""
    now = datetime.now(timezone.utc)
    return f"QT-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}"


@router.get("", response_model=QuoteListResponse)
async def list_quotes(
    db: DbSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    status_filter: Optional[QuoteStatus] = None,
):
    """
    List all quotes with pagination.
    """
    query = select(Quote)
    count_query = select(func.count(Quote.id))
    
    if status_filter:
        query = query.where(Quote.status == status_filter)
        count_query = count_query.where(Quote.status == status_filter)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    pages = (total + size - 1) // size
    
    # Get paginated results
    offset = (page - 1) * size
    query = query.order_by(desc(Quote.created_at)).offset(offset).limit(size)
    result = await db.execute(query)
    quotes = result.scalars().unique().all()
    
    return QuoteListResponse(
        items=[QuoteResponse.model_validate(q) for q in quotes],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(
    quote_id: UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    """Get a specific quote by ID."""
    result = await db.execute(
        select(Quote).where(Quote.id == quote_id)
    )
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    return QuoteResponse.model_validate(quote)


@router.get("/{quote_id}/public-link")
async def get_quote_public_link(
    quote_id: UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Generate a signed public link for the quote PDF.
    Valid for 7 days by default.
    """
    result = await db.execute(
        select(Quote).where(Quote.id == quote_id)
    )
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Generate signed params
    from ...core.security import create_signed_query_params
    
    path = f"/api/public/quote/{quote_id}/pdf"
    signed_query = create_signed_query_params(path)
    
    # Construct full URL
    # Use settings.public_api_url which should point to the domain (e.g. https://api.byteworksagency.com)
    base_url = settings.public_api_url.rstrip("/")
    full_url = f"{base_url}{path}?{signed_query}"
    
    return {"url": full_url}


@router.post("", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
async def create_quote(
    quote_data: QuoteCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Create a new quote.
    """
    # Calculate totals
    subtotal = sum(item.quantity * item.unit_price for item in quote_data.items)
    total = subtotal - quote_data.discount + quote_data.tax
    
    # Prepare items as JSON for the database
    items_as_json = [
        {
            "service_id": str(item.service_id) if item.service_id else None,
            "description": item.description,
            "quantity": item.quantity,
            "unit_price": float(item.unit_price),
            "total": float(item.quantity * item.unit_price),
            "sort_order": item.sort_order or i,
        }
        for i, item in enumerate(quote_data.items)
    ]
    
    # Create quote - use the quote_number from frontend
    # contact_id is required by DB, use lead_id as both contact_id and lead_id
    new_quote = Quote(
        quote_number=quote_data.quote_number,
        client_name=quote_data.client_name,
        client_email=quote_data.client_email,
        client_phone=quote_data.client_phone,
        client_company=quote_data.client_company,
        contact_id=quote_data.lead_id,  # Required FK
        lead_id=quote_data.lead_id,     # Optional secondary FK
        items_json=items_as_json,       # JSONB items column
        currency=quote_data.currency,
        subtotal=subtotal,
        discount=quote_data.discount,
        discount_type=quote_data.discount_type,
        discount_value=quote_data.discount_value,
        tax_rate=0,  # Default tax rate
        tax=quote_data.tax,
        total=total,
        valid_until=quote_data.valid_until,
        language=quote_data.language,
        notes=quote_data.notes,
        status=QuoteStatus.DRAFT,
    )
    
    db.add(new_quote)
    await db.flush()
    
    # Note: Items are stored in the JSONB column 'items_json' directly
    # No need to create separate QuoteItem records
    
    # Update lead status if linked
    if quote_data.lead_id:
        result = await db.execute(
            select(Contact).where(Contact.id == quote_data.lead_id)
        )
        lead = result.scalar_one_or_none()
        if lead:
            lead.status = ContactStatus.quoted
    
    await db.commit()
    await db.refresh(new_quote)
    
    return QuoteResponse.model_validate(new_quote)


@router.put("/{quote_id}", response_model=QuoteResponse)
async def update_quote(
    quote_id: UUID,
    quote_data: QuoteUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    """Update an existing quote."""
    result = await db.execute(
        select(Quote).where(Quote.id == quote_id)
    )
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Update fields
    update_data = quote_data.model_dump(exclude_unset=True)
    
    # Handle items separately if provided
    items_data = update_data.pop('items', None)
    if items_data is not None:
        # items_data is already a list of dicts from model_dump
        items_as_json = [
            {
                "service_id": str(item.get('service_id')) if item.get('service_id') else None,
                "description": item['description'],
                "quantity": item['quantity'],
                "unit_price": float(item['unit_price']),
                "total": float(item['quantity'] * item['unit_price']),
                "sort_order": item.get('sort_order', i),
            }
            for i, item in enumerate(items_data)
        ]
        quote.items_json = items_as_json
        # Recalculate subtotal
        quote.subtotal = sum(float(item['quantity']) * float(item['unit_price']) for item in items_data)
    
    # Apply other field updates
    for field, value in update_data.items():
        setattr(quote, field, value)
    
    # Recalculate total
    quote.total = float(quote.subtotal) - float(quote.discount) + float(quote.tax)
    
    await db.flush()
    await db.refresh(quote)
    
    return QuoteResponse.model_validate(quote)


@router.post("/{quote_id}/send", response_model=QuoteResponse)
async def send_quote(
    quote_id: UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    """Mark a quote as sent, set valid_until to 15 days, and send Notion + Email notification."""
    result = await db.execute(
        select(Quote).where(Quote.id == quote_id)
    )
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Update status and timestamps
    quote.status = QuoteStatus.SENT
    quote.sent_at = datetime.now(timezone.utc)
    
    # Set valid_until to exactly 15 days from now
    from datetime import timedelta
    quote.valid_until = (datetime.now(timezone.utc) + timedelta(days=15)).date()
    
    # Reset reminder flag so a new reminder can be sent
    quote.reminder_sent = False
    
    await db.flush()
    await db.refresh(quote)
    
    # Send Notion + Email notification (replacing Discord)
    from ...services.notifications import notify_new_quote
    from ...core.security import create_signed_query_params
    
    # Generate public PDF link (Signed, valid for 30 days)
    base_url = settings.public_api_url.rstrip("/")
    path = f"/api/public/quote/{quote.id}/pdf"
    signed_query = create_signed_query_params(path, valid_for_minutes=43200) # 30 days
    pdf_link = f"{base_url}{path}?{signed_query}"
    
    try:
        notification_result = await notify_new_quote(
            quote_number=quote.quote_number,
            client_name=quote.client_name,
            client_email=quote.client_email,
            total=float(quote.total),
            currency=quote.currency,
            valid_until=quote.valid_until.strftime("%Y-%m-%d"),
            client_phone=quote.client_phone,
            client_company=quote.client_company,
            pdf_link=pdf_link
        )
        
        # Save Notion page ID for later status updates
        if notification_result.get("notion_page_id"):
            quote.notion_page_id = notification_result["notion_page_id"]
            await db.flush()
            await db.refresh(quote)
            print(f"✅ Created quote in Notion: {quote.quote_number} (ID: {quote.notion_page_id})")
        
        if notification_result.get("notification_sent"):
            print(f"✅ Sent email notification for quote: {quote.quote_number}")
    except Exception as e:
        print(f"❌ Failed to send quote notification: {e}")
    
    return QuoteResponse.model_validate(quote)


@router.post("/{quote_id}/convert")
async def convert_quote(
    quote_id: UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Convert a quote to an invoice:
    1. Create an Invoice with the quote data
    2. Update the Contact status to CONVERTED (client)
    3. Delete the Quote
    4. Return the invoice_id for redirect
    """
    from sqlalchemy import delete as sql_delete
    from datetime import timedelta
    from ...models.invoice import Invoice, InvoiceStatus
    from ...models.contact import Contact, ContactStatus
    
    result = await db.execute(
        select(Quote).where(Quote.id == quote_id)
    )
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Generate invoice number (INV-YYYYMMDD-XXX format)
    today = date.today()
    date_str = today.strftime("%Y%m%d")
    
    # Count existing invoices to generate sequential number
    count_result = await db.execute(
        select(Invoice).where(Invoice.invoice_number.like(f"INV-{date_str}-%"))
    )
    existing_count = len(count_result.scalars().all())
    invoice_number = f"INV-{date_str}-{existing_count + 1:03d}"
    
    # Create new Invoice from Quote data
    invoice = Invoice(
        invoice_number=invoice_number,
        quote_id=None,  # Quote will be deleted
        contact_id=quote.contact_id,
        items=quote.items_json,  # Copy items from quote
        subtotal=quote.subtotal,
        tax_rate=quote.tax_rate if hasattr(quote, 'tax_rate') else 0,
        tax=quote.tax,
        total=quote.total,
        status=InvoiceStatus.PENDING,
        due_date=today + timedelta(days=3),  # 3 days to pay (deposit for starting work)
        notes=quote.notes,
    )
    db.add(invoice)
    
    # Update Contact status to CONVERTED (now a client)
    result = await db.execute(
        select(Contact).where(Contact.id == quote.contact_id)
    )
    contact = result.scalar_one_or_none()
    if contact:
        contact.status = ContactStatus.CONVERTED
        print(f"✅ Contact {contact.name} is now a CLIENT")
    
    # Store quote info for notification before deleting
    quote_number = quote.quote_number
    client_name = quote.client_name
    client_company = quote.client_company
    client_email = quote.client_email
    total = quote.total
    currency = quote.currency
    quote_notion_page_id = quote.notion_page_id  # Capture for Notion update
    
    # Delete the Quote using direct SQL to avoid cascade issues
    await db.execute(
        sql_delete(Quote).where(Quote.id == quote_id)
    )
    
    await db.flush()
    await db.refresh(invoice)
    
    # Generate public PDF link for the invoice (Signed, 30 days)
    from ...core.security import create_signed_query_params
    base_url = settings.public_api_url.rstrip("/")
    path = f"/api/public/invoice/{invoice.id}/pdf"
    signed_query = create_signed_query_params(path, valid_for_minutes=43200) # 30 days
    invoice_pdf_link = f"{base_url}{path}?{signed_query}"
    
    # Handle quote-to-invoice conversion in Notion + Email
    from ...services.notifications import handle_quote_to_invoice_conversion
    try:
        conversion_result = await handle_quote_to_invoice_conversion(
            invoice_number=invoice_number,
            quote_number=quote_number,
            client_name=client_name,
            client_email=client_email,
            client_phone=contact.phone if contact else None,
            client_company=client_company,
            total=float(total),
            currency=currency,
            due_date=invoice.due_date,
            quote_notion_id=quote_notion_page_id,  # Pass the Notion ID for status update
            invoice_crm_id=None,
            client_crm_id=None,
            pdf_link=invoice_pdf_link  # Pass the generated link
        )
        if conversion_result.get("client_notion_id"):
            print(f"✅ Created client in Notion: {client_name}")
        if conversion_result.get("invoice_notion_id"):
            # IMPORTANT: Save the Notion page ID to the invoice so we can update its status later
            invoice.notion_page_id = conversion_result["invoice_notion_id"]
            await db.commit()
            print(f"✅ Created invoice in Notion: {invoice_number} (ID: {invoice.notion_page_id})")
        if conversion_result.get("quote_updated"):
            print(f"✅ Updated quote status in Notion: {quote_number} -> Accepted")
    except Exception as e:
        print(f"❌ Failed to process conversion notification: {e}")
    
    # Return the invoice_id for redirect
    return {"invoice_id": str(invoice.id), "invoice_number": invoice_number}


@router.post("/{quote_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
async def reject_quote(
    quote_id: UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Reject a quote and delete all associated data.
    This completely removes the quote AND the lead/contact from the database.
    """
    from sqlalchemy import delete as sql_delete
    
    result = await db.execute(
        select(Quote).where(Quote.id == quote_id)
    )
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Store info before deleting
    lead_id = quote.lead_id
    contact_id = quote.contact_id
    quote_number = quote.quote_number
    client_name = quote.client_name
    client_email = quote.client_email
    notion_page_id = quote.notion_page_id
    
    # Delete the quote directly using SQL (avoids cascade relation loading)
    await db.execute(
        sql_delete(Quote).where(Quote.id == quote_id)
    )
    
    # If there's an associated lead/contact, delete it too
    # Delete the lead if it exists and is different from contact
    if lead_id:
        await db.execute(
            sql_delete(Contact).where(Contact.id == lead_id)
        )
        print(f"🗑️ Deleted lead: {lead_id}")
    
    # Also delete the contact if different from lead
    if contact_id and contact_id != lead_id:
        await db.execute(
            sql_delete(Contact).where(Contact.id == contact_id)
        )
        print(f"🗑️ Deleted contact: {contact_id}")
    
    await db.flush()
    
    print(f"❌ Quote {quote_number} for {client_name} was rejected and all data deleted")

    # Delete from Notion
    from ...services.notifications import delete_quote_and_lead_in_notion
    await delete_quote_and_lead_in_notion(notion_page_id, client_email)


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote(
    quote_id: UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    """Delete a quote."""
    from sqlalchemy import delete as sql_delete
    
    result = await db.execute(
        select(Quote).where(Quote.id == quote_id)
    )
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Use direct SQL delete to avoid cascade relation loading
    await db.execute(
        sql_delete(Quote).where(Quote.id == quote_id)
    )
    await db.flush()


@router.post("/maintenance/process-reminders")
async def process_quote_reminders(
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Process quote reminders and expirations.
    Should be called periodically (e.g., daily via cron job).
    
    - Sends reminder at day 7 for sent quotes
    - Marks quotes as expired after valid_until date passes
    """
    # date and timedelta already imported at file top
    today = date.today()
    processed = {"reminders_sent": 0, "expired": 0}
    
    # Find all SENT quotes
    result = await db.execute(
        select(Quote).where(Quote.status == QuoteStatus.SENT)
    )
    sent_quotes = result.scalars().all()
    
    for quote in sent_quotes:
        days_until_expiry = (quote.valid_until - today).days
        
        # Expire quotes that are past valid_until
        if days_until_expiry < 0:
            quote.status = QuoteStatus.EXPIRED
            processed["expired"] += 1
            print(f"📅 Quote {quote.quote_number} expired")
            continue
        
        # Send reminder at day 7-8 (halfway through)
        # Note: Email reminders can be added here in the future
        if 7 <= days_until_expiry <= 8 and not quote.reminder_sent:
            # Mark as reminder processed (email reminder can be implemented later)
            quote.reminder_sent = True
            processed["reminders_sent"] += 1
            print(f"📧 Quote {quote.quote_number} marked for follow-up (7 days left)")
    
    await db.flush()
    
    return {
        "success": True,
        "processed": processed,
        "message": f"Processed {len(sent_quotes)} sent quotes. Sent {processed['reminders_sent']} reminders, expired {processed['expired']} quotes."
    }
