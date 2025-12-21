"""
Quote routes for CRUD operations on quotes/estimates.
"""

from datetime import datetime, timezone
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
        select(Quote)
        .options(selectinload(Quote.quote_items))
        .where(Quote.id == quote_id)
    )
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Update fields
    update_data = quote_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(quote, field, value)
    
    # Recalculate total if discount or tax changed
    if 'discount' in update_data or 'tax' in update_data:
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
    """Mark a quote as sent and send Discord notification."""
    result = await db.execute(
        select(Quote).where(Quote.id == quote_id)
    )
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    quote.status = QuoteStatus.SENT
    quote.sent_at = datetime.now(timezone.utc)
    
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


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote(
    quote_id: UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    """Delete a quote."""
    result = await db.execute(
        select(Quote).where(Quote.id == quote_id)
    )
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    await db.delete(quote)
    await db.flush()
