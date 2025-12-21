"""
Invoice management routes (CRUD operations).
"""

from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select, func

from ..deps import DbSession, CurrentUser
from ...models.invoice import Invoice, InvoiceStatus
from ...models.quote import Quote
from ...models.contact import Contact
from ...schemas.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, 
    InvoiceListResponse, InvoiceFromQuote, InvoiceMarkPaid
)
from ...core.config import settings

router = APIRouter()


async def generate_invoice_number(db: DbSession) -> str:
    """Generate next invoice number (INV-0001 format)."""
    result = await db.execute(select(func.count(Invoice.id)))
    count = result.scalar() or 0
    return f"INV-{(count + 1):04d}"


@router.get("", response_model=InvoiceListResponse)
async def list_invoices(
    db: DbSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[InvoiceStatus] = None,
    contact_id: Optional[UUID] = None
):
    """List all invoices with pagination."""
    from sqlalchemy.orm import selectinload
    
    query = select(Invoice).options(selectinload(Invoice.contact))
    count_query = select(func.count(Invoice.id))
    
    if status:
        query = query.where(Invoice.status == status)
        count_query = count_query.where(Invoice.status == status)
    
    if contact_id:
        query = query.where(Invoice.contact_id == contact_id)
        count_query = count_query.where(Invoice.contact_id == contact_id)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    offset = (page - 1) * size
    query = query.order_by(Invoice.created_at.desc()).offset(offset).limit(size)
    
    result = await db.execute(query)
    invoices = result.scalars().all()
    pages = (total + size - 1) // size
    
    # Build response with contact info
    invoice_responses = []
    for inv in invoices:
        inv_dict = InvoiceResponse.model_validate(inv).model_dump()
        if inv.contact:
            inv_dict['contact'] = {
                'id': str(inv.contact.id),
                'name': inv.contact.name,
                'email': inv.contact.email,
                'phone': inv.contact.phone,
                'company': inv.contact.company,
            }
        invoice_responses.append(inv_dict)
    
    return InvoiceListResponse(
        items=invoice_responses,
        total=total, page=page, size=size, pages=pages
    )


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(data: InvoiceCreate, db: DbSession, current_user: CurrentUser):
    """Create a new invoice."""
    result = await db.execute(select(Contact).where(Contact.id == data.contact_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Contact not found")
    
    invoice_number = await generate_invoice_number(db)
    items_dict = [item.model_dump() for item in data.items]
    
    invoice = Invoice(
        invoice_number=invoice_number,
        contact_id=data.contact_id,
        quote_id=data.quote_id,
        items=items_dict,
        tax_rate=data.tax_rate,
        due_date=data.due_date,
        notes=data.notes
    )
    invoice.calculate_totals()
    
    db.add(invoice)
    await db.flush()
    await db.refresh(invoice)
    
    return InvoiceResponse.model_validate(invoice)


@router.post("/from-quote", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice_from_quote(data: InvoiceFromQuote, db: DbSession, current_user: CurrentUser):
    """Create invoice from an existing quote."""
    result = await db.execute(select(Quote).where(Quote.id == data.quote_id))
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    invoice_number = await generate_invoice_number(db)
    
    invoice = Invoice(
        invoice_number=invoice_number,
        quote_id=quote.id,
        contact_id=quote.contact_id,
        items=quote.items,
        subtotal=quote.subtotal,
        tax_rate=quote.tax_rate,
        tax=quote.tax,
        total=quote.total,
        due_date=data.due_date
    )
    
    db.add(invoice)
    await db.flush()
    await db.refresh(invoice)
    
    return InvoiceResponse.model_validate(invoice)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(invoice_id: UUID, db: DbSession, current_user: CurrentUser):
    """Get an invoice by ID."""
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return InvoiceResponse.model_validate(invoice)


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(invoice_id: UUID, data: InvoiceUpdate, db: DbSession, current_user: CurrentUser):
    """Update an invoice."""
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "items" in update_data:
        invoice.items = [item.model_dump() for item in data.items]
        del update_data["items"]
    
    for field, value in update_data.items():
        setattr(invoice, field, value)
    
    invoice.calculate_totals()
    await db.flush()
    await db.refresh(invoice)
    
    return InvoiceResponse.model_validate(invoice)


@router.post("/{invoice_id}/mark-paid")
async def mark_invoice_paid(invoice_id: UUID, data: InvoiceMarkPaid, db: DbSession, current_user: CurrentUser):
    """
    Mark an invoice as paid and generate the next month's invoice.
    Returns the paid invoice and the new invoice info.
    """
    from datetime import date, timedelta
    from sqlalchemy.orm import selectinload
    
    # Load invoice with contact info for notification
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.contact))
        .where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Mark as paid
    print(f"📝 Marking invoice {invoice.invoice_number} as paid (current status: {invoice.status})")
    invoice.mark_as_paid(data.payment_method)
    print(f"📝 After mark_as_paid: status = {invoice.status}, paid_at = {invoice.paid_at}")
    
    await db.flush()
    await db.commit()  # Commit immediately to ensure status is saved before notifications
    
    # Re-fetch the invoice to confirm the status was saved
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    print(f"✅ After commit and re-fetch: status = {invoice.status}")
    
    # Handle payment notification (Notion + Email)
    try:
        from ...services.notifications import handle_payment_received
        
        # Log the Notion page ID status
        if invoice.notion_page_id:
            print(f"📝 Invoice {invoice.invoice_number} has Notion ID: {invoice.notion_page_id}")
        else:
            print(f"⚠️ Invoice {invoice.invoice_number} has NO Notion ID - status won't update in Notion")
        
        # Generate generic link structure
        base_url = settings.public_api_url
        receipt_link = f"{base_url}/api/public/receipt/{invoice.id}/pdf"
        
        payment_result = await handle_payment_received(
            invoice_number=invoice.invoice_number,
            client_name=invoice.contact.name if invoice.contact else "Unknown Client",
            amount=float(invoice.total),
            currency="USD",  # Default currency
            method=data.payment_method or "Zelle",
            payment_date=invoice.paid_at.date() if invoice.paid_at else date.today(),
            invoice_notion_id=invoice.notion_page_id,  # Pass Notion ID to update status
            client_notion_id=None,
            invoice_crm_id=None,
            receipt_link=receipt_link
        )
        if payment_result.get("payment_notion_id"):
            print(f"✅ Created payment in Notion for {invoice.invoice_number}")
        if payment_result.get("invoice_updated"):
            print(f"✅ Updated invoice status to 'Paid' in Notion for {invoice.invoice_number}")
        if payment_result.get("notification_sent"):
            print(f"✅ Payment notification sent for {invoice.invoice_number}")
    except Exception as e:
        print(f"❌ Failed to process payment notification: {e}")
    
    # Generate next month's invoice
    next_invoice_number = await generate_invoice_number(db)
    today = date.today()
    
    # Due date: ~1 month from today (30 days) + 3 days grace period
    next_due_date = today + timedelta(days=33)
    
    next_invoice = Invoice(
        invoice_number=next_invoice_number,
        contact_id=invoice.contact_id,
        items=invoice.items,  # Same items as current invoice
        subtotal=invoice.subtotal,
        tax_rate=invoice.tax_rate,
        tax=invoice.tax,
        total=invoice.total,
        status=InvoiceStatus.PENDING,
        due_date=next_due_date,
        notes=invoice.notes,
    )
    db.add(next_invoice)
    await db.flush()
    await db.commit()  # Commit the new invoice
    await db.refresh(next_invoice)
    
    print(f"✅ Created next month invoice: {next_invoice_number} (due: {next_due_date})")
    
    # Create the new invoice in Notion
    try:
        # Generate public PDF link for the invoice
        base_url = settings.public_api_url
        next_invoice_pdf_link = f"{base_url}/api/public/invoice/{next_invoice.id}/pdf"

        from ...services.notion import create_invoice_in_notion
        next_invoice_notion_id = await create_invoice_in_notion(
            invoice_number=next_invoice.invoice_number,
            total=float(next_invoice.total),
            currency="USD",
            status="Pending",
            due_date=next_invoice.due_date,
            client_notion_id=None,  # TODO: Could store client's Notion ID in Contact model
            quote_notion_id=None,
            crm_id=None,
            pdf_link=next_invoice_pdf_link
        )
        if next_invoice_notion_id:
            # Save the Notion page ID to our database
            next_invoice.notion_page_id = next_invoice_notion_id
            await db.commit()
            print(f"✅ Created next month invoice in Notion: {next_invoice_notion_id}")

        # Send email notification for the NEW invoice
        from ...services.email import notify_new_invoice
        
        contact = invoice.contact
        if contact and contact.email:
            await notify_new_invoice(
                invoice_number=next_invoice.invoice_number,
                client_name=contact.name,
                client_email=contact.email,
                client_phone=contact.phone,
                client_company=contact.company,
                total=float(next_invoice.total),
                currency="USD",
                due_date=next_invoice.due_date.strftime("%Y-%m-%d"),
                pdf_link=next_invoice_pdf_link
            )
            print(f"✅ Sent new invoice notification to {contact.email}")

    except Exception as e:
        print(f"❌ Failed to process new invoice notification/Notion: {e}")
    
    # Build response manually to avoid lazy loading contact
    paid_invoice_data = {
        "id": str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "contact_id": str(invoice.contact_id),
        "total": float(invoice.total),
        "status": invoice.status.value,
        "paid_at": invoice.paid_at.isoformat() if invoice.paid_at else None,
    }
    
    return {
        "paid_invoice": paid_invoice_data,
        "next_invoice": {
            "id": str(next_invoice.id),
            "invoice_number": next_invoice.invoice_number,
            "due_date": str(next_invoice.due_date),
        }
    }


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(invoice_id: UUID, db: DbSession, current_user: CurrentUser):
    """Delete an invoice."""
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    await db.delete(invoice)
