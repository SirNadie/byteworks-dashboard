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
    query = select(Invoice)
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
    
    return InvoiceListResponse(
        items=[InvoiceResponse.model_validate(i) for i in invoices],
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


@router.post("/{invoice_id}/mark-paid", response_model=InvoiceResponse)
async def mark_invoice_paid(invoice_id: UUID, data: InvoiceMarkPaid, db: DbSession, current_user: CurrentUser):
    """Mark an invoice as paid."""
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice.mark_as_paid(data.payment_method)
    await db.flush()
    await db.refresh(invoice)
    
    return InvoiceResponse.model_validate(invoice)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(invoice_id: UUID, db: DbSession, current_user: CurrentUser):
    """Delete an invoice."""
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    await db.delete(invoice)
