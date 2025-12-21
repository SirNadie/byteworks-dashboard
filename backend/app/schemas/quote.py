"""
Pydantic schemas for Quote API validation.
"""

from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from decimal import Decimal

from pydantic import BaseModel, Field

from ..models.quote import QuoteStatus


# Quote Item Schemas
class QuoteItemBase(BaseModel):
    """Base schema for quote items."""
    description: str = Field(..., min_length=1, max_length=500)
    quantity: int = Field(default=1, ge=1)
    unit_price: float = Field(..., ge=0)


class QuoteItemCreate(QuoteItemBase):
    """Schema for creating a quote item."""
    service_id: Optional[UUID] = None
    sort_order: int = 0


class QuoteItemResponse(QuoteItemBase):
    """Schema for quote item response."""
    id: UUID
    service_id: Optional[UUID] = None
    total: float
    sort_order: int
    
    class Config:
        from_attributes = True


# Quote Schemas
class QuoteBase(BaseModel):
    """Base schema for quotes."""
    client_name: str = Field(..., min_length=2, max_length=100)
    client_email: str = Field(..., max_length=255)
    client_phone: Optional[str] = Field(None, max_length=50)
    client_company: Optional[str] = Field(None, max_length=100)
    currency: str = Field(default="USD", max_length=3)
    notes: Optional[str] = None


class QuoteCreate(QuoteBase):
    """Schema for creating a new quote."""
    quote_number: str = Field(..., min_length=1, max_length=50)
    lead_id: Optional[UUID] = None
    valid_until: date
    items: List[QuoteItemCreate]
    discount: float = Field(default=0, ge=0)
    discount_type: str = Field(default="percentage", max_length=20)
    discount_value: float = Field(default=0, ge=0)
    tax: float = Field(default=0, ge=0)
    language: str = Field(default="en", max_length=2)


class QuoteItemUpdate(BaseModel):
    """Schema for updating a quote item."""
    service_id: Optional[UUID] = None
    description: str = Field(..., min_length=1, max_length=500)
    quantity: int = Field(default=1, ge=1)
    unit_price: float = Field(..., ge=0)
    sort_order: int = 0


class QuoteUpdate(BaseModel):
    """Schema for updating a quote."""
    client_name: Optional[str] = Field(None, min_length=2, max_length=100)
    client_email: Optional[str] = Field(None, max_length=255)
    client_phone: Optional[str] = Field(None, max_length=50)
    client_company: Optional[str] = Field(None, max_length=100)
    currency: Optional[str] = Field(None, max_length=3)
    notes: Optional[str] = None
    valid_until: Optional[date] = None
    discount: Optional[float] = Field(None, ge=0)
    discount_type: Optional[str] = Field(None, max_length=20)
    discount_value: Optional[float] = Field(None, ge=0)
    tax: Optional[float] = Field(None, ge=0)
    language: Optional[str] = Field(None, max_length=2)
    items: Optional[List[QuoteItemUpdate]] = None
    status: Optional[QuoteStatus] = None


class QuoteResponse(QuoteBase):
    """Schema for quote response."""
    id: UUID
    quote_number: str
    contact_id: UUID
    lead_id: Optional[UUID] = None
    status: str
    subtotal: float
    discount: float
    discount_type: str
    discount_value: float
    tax: float
    total: float
    valid_until: date
    language: str
    reminder_sent: bool
    created_at: datetime
    updated_at: datetime
    sent_at: Optional[datetime] = None
    # Items stored as JSONB in the database, mapped from 'items_json' attribute
    items: List[dict] = Field(default=[], validation_alias="items_json")
    
    class Config:
        from_attributes = True
        populate_by_name = True


class QuoteListResponse(BaseModel):
    """Schema for paginated quote list."""
    items: List[QuoteResponse]
    total: int
    page: int
    size: int
    pages: int
