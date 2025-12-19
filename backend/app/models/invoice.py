"""
Invoice model for billing.
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


class InvoiceStatus(str, PyEnum):
    """Invoice payment status."""
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class Invoice(Base):
    """Invoice model for client billing."""
    
    __tablename__ = "invoices"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    invoice_number: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True
    )
    
    quote_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quotes.id", ondelete="SET NULL"),
        nullable=True
    )
    
    contact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("contacts.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Items stored as JSON array
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
        default=Decimal("18.00")
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
    
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus),
        default=InvoiceStatus.PENDING,
        nullable=False,
        index=True
    )
    
    due_date: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )
    
    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    payment_method: Mapped[str | None] = mapped_column(
        String(50),
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
    quote = relationship("Quote", back_populates="invoice")
    contact = relationship("Contact", back_populates="invoices")
    
    def calculate_totals(self) -> None:
        """Calculate subtotal, tax, and total from items."""
        self.subtotal = sum(
            Decimal(str(item.get("quantity", 0))) * Decimal(str(item.get("unit_price", 0)))
            for item in self.items
        )
        self.tax = self.subtotal * (self.tax_rate / Decimal("100"))
        self.total = self.subtotal + self.tax
    
    def mark_as_paid(self, payment_method: str = None) -> None:
        """Mark invoice as paid."""
        self.status = InvoiceStatus.PAID
        self.paid_at = datetime.now(timezone.utc)
        if payment_method:
            self.payment_method = payment_method
    
    def __repr__(self) -> str:
        return f"<Invoice {self.invoice_number}>"
