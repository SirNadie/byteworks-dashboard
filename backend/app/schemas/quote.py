"""
Pydantic schemas for Quote API validation.
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from ..models.quote import QuoteStatus


class QuoteItemCreate(BaseModel):
    """Schema for a quote line item."""
    description: str = Field(..., min_length=1, max_length=500)
    quantity: int = Field(..., ge=1)
    unit_price: Decimal = Field(..., ge=0, decimal_places=2)
    
    @field_validator('unit_price', mode='before')
    @classmethod
    def convert_unit_price(cls, v):
        if isinstance(v, (int, float)):
            return Decimal(str(v))
        return v


class QuoteBase(BaseModel):
    """Base quote schema with common fields."""
    contact_id: UUID
    items: List[QuoteItemCreate] = Field(..., min_length=1)
    tax_rate: Decimal = Field(default=Decimal("18.00"), ge=0, le=100)
    valid_until: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=1000)


class QuoteCreate(QuoteBase):
    """Schema for creating a new quote."""
    pass


class QuoteUpdate(BaseModel):
    """Schema for updating quote data."""
    items: Optional[List[QuoteItemCreate]] = None
    tax_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    status: Optional[QuoteStatus] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=1000)


class QuoteItemResponse(BaseModel):
    """Schema for quote item in response."""
    description: str
    quantity: int
    unit_price: Decimal
    line_total: Optional[Decimal] = None


class QuoteResponse(BaseModel):
    """Schema for quote response data."""
    id: UUID
    quote_number: str
    contact_id: UUID
    items: List[QuoteItemResponse]
    subtotal: Decimal
    tax_rate: Decimal
    tax: Decimal
    total: Decimal
    status: QuoteStatus
    valid_until: Optional[date]
    notes: Optional[str]
    pdf_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class QuoteListResponse(BaseModel):
    """Schema for paginated quote list."""
    items: list[QuoteResponse]
    total: int
    page: int
    size: int
    pages: int
