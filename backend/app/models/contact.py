"""
Contact model for clients and leads.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import String, DateTime, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.database import Base


class ContactSource(str, PyEnum):
    """Source where the contact came from."""
    WEB_FORM = "web_form"
    REFERRAL = "referral"
    LINKEDIN = "linkedin"
    EMAIL = "email"
    PHONE = "phone"
    OTHER = "other"


class ContactStatus(str, PyEnum):
    """Contact status in the sales pipeline.
    
    Note: Enum names must match exactly what's stored in PostgreSQL.
    Original values are uppercase, new values (drafting, quoted) are lowercase.
    """
    NEW = "NEW"
    drafting = "drafting"  # Quote creation in progress
    quoted = "quoted"      # Quote sent, waiting for response
    CONTACTED = "CONTACTED"
    QUALIFIED = "QUALIFIED"
    CONVERTED = "CONVERTED"
    LOST = "LOST"


class ContactMethod(str, PyEnum):
    """Preferred contact method."""
    WHATSAPP = "whatsapp"
    EMAIL = "email"


class Contact(Base):
    """Contact model for CRM clients and leads."""
    
    __tablename__ = "contacts"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )
    
    phone: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )
    
    company: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )
    
    source: Mapped[ContactSource] = mapped_column(
        Enum(ContactSource),
        default=ContactSource.OTHER,
        nullable=False
    )
    
    status: Mapped[ContactStatus] = mapped_column(
        Enum(ContactStatus),
        default=ContactStatus.NEW,
        nullable=False,
        index=True
    )
    
    contact_method: Mapped[ContactMethod | None] = mapped_column(
        Enum(ContactMethod),
        nullable=True,
        default=None
    )
    
    notes: Mapped[str | None] = mapped_column(
        Text,
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
    quotes = relationship("Quote", back_populates="contact", lazy="selectin")
    invoices = relationship("Invoice", back_populates="contact", lazy="selectin")
    
    def __repr__(self) -> str:
        return f"<Contact {self.name} ({self.email})>"
