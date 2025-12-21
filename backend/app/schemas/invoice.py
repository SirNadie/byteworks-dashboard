"""
Pydantic schemas for Invoice API validation.
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field

from ..models.invoice import InvoiceStatus


# Invoice Item Schema (different from QuoteItemResponse - no id, simple structure)
class InvoiceItemResponse(BaseModel):
    """Schema for invoice item response (stored as JSON, no id)."""
    description: str
    quantity: int
    unit_price: float
    total: Optional[float] = None
    service_id: Optional[str] = None
    sort_order: Optional[int] = 0
    
    class Config:
        from_attributes = True


class InvoiceBase(BaseModel):
    """Base invoice schema with common fields."""
    contact_id: UUID
    items: List[dict] = Field(..., min_length=1)
    tax_rate: Decimal = Field(default=Decimal("18.00"), ge=0, le=100)
    due_date: date
    notes: Optional[str] = Field(None, max_length=1000)


class InvoiceCreate(InvoiceBase):
    """Schema for creating a new invoice."""
    quote_id: Optional[UUID] = None


class InvoiceFromQuote(BaseModel):
    """Schema for creating invoice from existing quote."""
    quote_id: UUID
    due_date: date


class InvoiceUpdate(BaseModel):
    """Schema for updating invoice data."""
    items: Optional[List[dict]] = None
    tax_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    status: Optional[InvoiceStatus] = None
    due_date: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=1000)


class InvoiceMarkPaid(BaseModel):
    """Schema for marking invoice as paid."""
    payment_method: Optional[str] = Field(None, max_length=50)


class ContactInfo(BaseModel):
    """Minimal contact info for invoice responses."""
    id: UUID
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    
    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    """Schema for invoice response data."""
    id: UUID
    invoice_number: str
    quote_id: Optional[UUID]
    contact_id: UUID
    contact: Optional[ContactInfo] = None
    items: List[InvoiceItemResponse]
    subtotal: Decimal
    tax_rate: Decimal
    tax: Decimal
    total: Decimal
    status: InvoiceStatus
    due_date: date
    paid_at: Optional[datetime]
    payment_method: Optional[str]
    notes: Optional[str]
    pdf_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    """Schema for paginated invoice list."""
    items: list[InvoiceResponse]
    total: int
    page: int
    size: int
    pages: int
