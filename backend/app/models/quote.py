"""
Quote and QuoteItem models for managing quotes/estimates.
"""

import uuid
from datetime import datetime, timezone, date
from enum import Enum as PyEnum
from decimal import Decimal
from typing import TYPE_CHECKING, Optional, Any

from sqlalchemy import String, DateTime, Text, Numeric, ForeignKey, Date, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.database import Base

if TYPE_CHECKING:
    from .contact import Contact
    from .invoice import Invoice


class QuoteStatus(str, PyEnum):
    """Quote status enum."""
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


class Quote(Base):
    """Quote model for managing estimates/quotes."""
    
    __tablename__ = "quotes"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    # Quote identification
    quote_number: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
        index=True
    )
    
    # Client info (can be different from lead/contact)
    client_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    
    client_email: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    
    client_phone: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )
    
    client_company: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )
    
    # Primary contact reference (required by DB)
    contact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("contacts.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Optional secondary lead reference
    lead_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("contacts.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # Items stored as JSONB (DB schema requires this)
    items_json: Mapped[list[dict[str, Any]]] = mapped_column(
        "items",  # Map to 'items' column in DB
        JSONB,
        nullable=False,
        default=list
    )
    
    # Quote details
    status: Mapped[QuoteStatus] = mapped_column(
        String(20),
        default=QuoteStatus.DRAFT,
        nullable=False
    )
    
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="USD"
    )
    
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0
    )
    
    discount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0
    )
    
    discount_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="percentage"  # 'percentage' or 'fixed'
    )
    
    discount_value: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0
    )
    
    tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=0
    )
    
    tax: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0
    )
    
    total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0
    )
    
    # Validity
    valid_until: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )
    
    # Language for the quote ('en' or 'es')
    language: Mapped[str] = mapped_column(
        String(2),
        nullable=False,
        default="en"
    )
    
    # Notes
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    
    # Reminder tracking
    reminder_sent: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    
    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Relationships
    quote_items: Mapped[list["QuoteItem"]] = relationship(
        "QuoteItem",
        back_populates="quote",
        cascade="all, delete-orphan"
    )
    
    contact: Mapped[Optional["Contact"]] = relationship(
        "Contact",
        back_populates="quotes",
        foreign_keys=[contact_id]
    )
    
    invoice: Mapped[Optional["Invoice"]] = relationship(
        "Invoice",
        back_populates="quote",
        uselist=False
    )
    
    def __repr__(self) -> str:
        return f"<Quote {self.quote_number} - {self.status}>"


class QuoteItem(Base):
    """Individual line item in a quote."""
    
    __tablename__ = "quote_items"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    quote_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quotes.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Reference to service (optional)
    service_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("services.id", ondelete="SET NULL"),
        nullable=True
    )
    
    description: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )
    
    quantity: Mapped[int] = mapped_column(
        nullable=False,
        default=1
    )
    
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )
    
    total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )
    
    # Order in the quote
    sort_order: Mapped[int] = mapped_column(
        nullable=False,
        default=0
    )
    
    # Relationship
    quote: Mapped["Quote"] = relationship(
        "Quote",
        back_populates="quote_items"
    )
    
    def __repr__(self) -> str:
        return f"<QuoteItem {self.description[:30]}>"
