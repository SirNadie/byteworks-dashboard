"""
Service model for the service catalog.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import String, DateTime, Text, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..core.database import Base


class ServiceCategory(str, PyEnum):
    """Categories for services."""
    WEB_DEVELOPMENT = "web_development"
    DESIGN = "design"
    MARKETING = "marketing"
    CONSULTING = "consulting"
    MAINTENANCE = "maintenance"
    OTHER = "other"


class Service(Base):
    """Service model for the service catalog."""
    
    __tablename__ = "services"
    
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
    
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    
    # Default price (can be overridden in quotes)
    default_price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0.0
    )
    
    # Currency for the default price
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="USD"
    )
    
    category: Mapped[ServiceCategory] = mapped_column(
        String(50),
        default=ServiceCategory.OTHER,
        nullable=False
    )
    
    # Is this service active (visible in the catalog)?
    is_active: Mapped[bool] = mapped_column(
        default=True,
        nullable=False
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
    
    def __repr__(self) -> str:
        return f"<Service {self.name} - ${self.default_price}>"
