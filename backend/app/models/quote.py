"""
Quote model for quotations/proposals.
"""

import uuid
from datetime import datetime, timezone, date
from decimal import Decimal
from enum import Enum as PyEnum
from typing import List, Dict, Any

from sqlalchemy import String, DateTime, Enum, Date, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.database import Base


class QuoteStatus(str, PyEnum):
    """Quote status in the sales process."""
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


class Quote(Base):
    """Quote model for client quotations."""
    
    __tablename__ = "quotes"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    quote_number: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True
    )
    
    contact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("contacts.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Items stored as JSON array: [{"description": "", "quantity": 1, "unit_price": 100.00}]
    items: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=list
    )
    
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00")
    )
    
    tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("18.00")  # 18% ITBIS (Dominican Republic)
    )
    
    tax: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00")
    )
    
    total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00")
    )
    
    status: Mapped[QuoteStatus] = mapped_column(
        Enum(QuoteStatus),
        default=QuoteStatus.DRAFT,
        nullable=False,
        index=True
    )
    
    valid_until: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )
    
    notes: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True
    )
    
    pdf_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )
    
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
    
    # Relationships
    contact = relationship("Contact", back_populates="quotes")
    invoice = relationship("Invoice", back_populates="quote", uselist=False)
    
    def calculate_totals(self) -> None:
        """Calculate subtotal, tax, and total from items."""
        self.subtotal = sum(
            Decimal(str(item.get("quantity", 0))) * Decimal(str(item.get("unit_price", 0)))
            for item in self.items
        )
        self.tax = self.subtotal * (self.tax_rate / Decimal("100"))
        self.total = self.subtotal + self.tax
    
    def __repr__(self) -> str:
        return f"<Quote {self.quote_number}>"
