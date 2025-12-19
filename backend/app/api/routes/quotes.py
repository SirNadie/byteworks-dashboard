"""
Quote management routes (CRUD operations).
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select, func
from decimal import Decimal

from ..deps import DbSession, CurrentUser
from ...models.quote import Quote, QuoteStatus
from ...models.contact import Contact
from ...schemas.quote import QuoteCreate, QuoteUpdate, QuoteResponse, QuoteListResponse

router = APIRouter()


async def generate_quote_number(db: DbSession) -> str:
    """Generate next quote number (COT-0001 format)."""
    result = await db.execute(
        select(func.count(Quote.id))
    )
    count = result.scalar() or 0
    return f"COT-{(count + 1):04d}"


@router.get("", response_model=QuoteListResponse)
async def list_quotes(
    db: DbSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[QuoteStatus] = None,
    contact_id: Optional[UUID] = None
):
    """List all quotes with pagination and filtering."""
    query = select(Quote)
    count_query = select(func.count(Quote.id))
    
    if status:
        query = query.where(Quote.status == status)
        count_query = count_query.where(Quote.status == status)
    
    if contact_id:
        query = query.where(Quote.contact_id == contact_id)
        count_query = count_query.where(Quote.contact_id == contact_id)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    offset = (page - 1) * size
    query = query.order_by(Quote.created_at.desc()).offset(offset).limit(size)
    
    result = await db.execute(query)
    quotes = result.scalars().all()
    
    pages = (total + size - 1) // size
    
    return QuoteListResponse(
        items=[QuoteResponse.model_validate(q) for q in quotes],
        total=total, page=page, size=size, pages=pages
    )


@router.post("", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
async def create_quote(data: QuoteCreate, db: DbSession, current_user: CurrentUser):
    """Create a new quote."""
    # Verify contact exists
    result = await db.execute(select(Contact).where(Contact.id == data.contact_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Contact not found")
    
    quote_number = await generate_quote_number(db)
    items_dict = [item.model_dump() for item in data.items]
    
    quote = Quote(
        quote_number=quote_number,
        contact_id=data.contact_id,
        items=items_dict,
        tax_rate=data.tax_rate,
        valid_until=data.valid_until,
        notes=data.notes
    )
    quote.calculate_totals()
    
    db.add(quote)
    await db.flush()
    await db.refresh(quote)
    
    return QuoteResponse.model_validate(quote)


@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(quote_id: UUID, db: DbSession, current_user: CurrentUser):
    """Get a quote by ID."""
    result = await db.execute(select(Quote).where(Quote.id == quote_id))
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    return QuoteResponse.model_validate(quote)


@router.patch("/{quote_id}", response_model=QuoteResponse)
async def update_quote(quote_id: UUID, data: QuoteUpdate, db: DbSession, current_user: CurrentUser):
    """Update a quote."""
    result = await db.execute(select(Quote).where(Quote.id == quote_id))
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "items" in update_data:
        quote.items = [item.model_dump() for item in data.items]
        del update_data["items"]
    
    for field, value in update_data.items():
        setattr(quote, field, value)
    
    quote.calculate_totals()
    await db.flush()
    await db.refresh(quote)
    
    return QuoteResponse.model_validate(quote)


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote(quote_id: UUID, db: DbSession, current_user: CurrentUser):
    """Delete a quote."""
    result = await db.execute(select(Quote).where(Quote.id == quote_id))
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    await db.delete(quote)
