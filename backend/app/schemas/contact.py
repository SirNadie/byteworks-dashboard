"""
Pydantic schemas for Contact API validation.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from ..models.contact import ContactSource, ContactStatus


class ContactBase(BaseModel):
    """Base contact schema with common fields."""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=50)
    company: Optional[str] = Field(None, max_length=100)
    source: ContactSource = ContactSource.OTHER
    notes: Optional[str] = None


class ContactCreate(ContactBase):
    """Schema for creating a new contact."""
    status: ContactStatus = ContactStatus.NEW


class ContactUpdate(BaseModel):
    """Schema for updating contact data."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    company: Optional[str] = Field(None, max_length=100)
    source: Optional[ContactSource] = None
    status: Optional[ContactStatus] = None
    notes: Optional[str] = None


class ContactResponse(ContactBase):
    """Schema for contact response data."""
    id: UUID
    status: ContactStatus
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ContactListResponse(BaseModel):
    """Schema for paginated contact list."""
    items: list[ContactResponse]
    total: int
    page: int
    size: int
    pages: int


class PublicContactRequest(BaseModel):
    """Schema for public contact form submissions."""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = None
    message: Optional[str] = None
    bot_field: Optional[str] = None  # Honeypot

