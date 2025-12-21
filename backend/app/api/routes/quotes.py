"""
Quote routes for CRUD operations on quotes/estimates.
"""

from datetime import datetime, timezone, date, timedelta
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
    QuoteItemResponse,
)

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
    """Mark a quote as sent, set valid_until to 15 days, and send Discord notification."""
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
    
    # Send Discord notification
    from ...services.discord import notify_new_quote
    try:
        await notify_new_quote(
            quote_number=quote.quote_number,
            client_name=quote.client_name,
            client_email=quote.client_email,
            client_phone=quote.client_phone,
            client_company=quote.client_company,
            total=float(quote.total),
            currency=quote.currency,
            valid_until=quote.valid_until.strftime("%Y-%m-%d"),
        )
        print(f"✅ Sent quote notification to Discord: {quote.quote_number}")
    except Exception as e:
        print(f"❌ Failed to send Discord notification: {e}")
    
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
    currency_symbol = "$" if currency == "USD" else "TT$"
    
    # Delete the Quote using direct SQL to avoid cascade issues
    await db.execute(
        sql_delete(Quote).where(Quote.id == quote_id)
    )
    
    await db.flush()
    await db.refresh(invoice)
    
    # Send Discord notification about conversion
    from ...services.discord import send_discord_message, get_quotes_webhook
    try:
        embed = {
            "title": "🎉 Quote Converted to Invoice!",
            "color": 5763719,  # Green color
            "fields": [
                {"name": "📋 Quote #", "value": quote_number, "inline": True},
                {"name": "🧾 Invoice #", "value": invoice_number, "inline": True},
                {"name": "💰 Total", "value": f"{currency_symbol}{total:,.2f} {currency}", "inline": True},
                {"name": "👤 Client", "value": client_name, "inline": True},
                {"name": "🏢 Company", "value": client_company or "N/A", "inline": True},
                {"name": "📧 Email", "value": client_email, "inline": True},
            ],
            "footer": {"text": "ByteWorks CRM - New Client! 🎊"},
        }
        await send_discord_message(get_quotes_webhook(), "🎊 **QUOTE CONVERTED TO INVOICE!** New client! 🎊", embed)
        print(f"✅ Sent quote conversion notification to Discord: {quote_number} → {invoice_number}")
    except Exception as e:
        print(f"❌ Failed to send Discord notification: {e}")
    
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
    from datetime import timedelta, date
    from ...services.discord import notify_quote_reminder
    
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
        if 7 <= days_until_expiry <= 8 and not quote.reminder_sent:
            try:
                await notify_quote_reminder(
                    quote_number=quote.quote_number,
                    client_name=quote.client_name,
                    client_email=quote.client_email,
                    client_phone=quote.client_phone,
                    total=float(quote.total),
                    currency=quote.currency,
                    days_remaining=days_until_expiry,
                    valid_until=quote.valid_until.strftime("%Y-%m-%d"),
                )
                quote.reminder_sent = True
                processed["reminders_sent"] += 1
                print(f"📧 Sent reminder for quote {quote.quote_number}")
            except Exception as e:
                print(f"❌ Failed to send reminder for {quote.quote_number}: {e}")
    
    await db.flush()
    
    return {
        "success": True,
        "processed": processed,
        "message": f"Processed {len(sent_quotes)} sent quotes. Sent {processed['reminders_sent']} reminders, expired {processed['expired']} quotes."
    }
