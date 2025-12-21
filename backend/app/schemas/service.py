"""
Pydantic schemas for Service API validation.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from ..models.service import ServiceCategory


class ServiceBase(BaseModel):
    """Base service schema with common fields."""
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    default_price: float = Field(..., ge=0)
    currency: str = Field(default="USD", max_length=3)
    category: ServiceCategory = ServiceCategory.OTHER


class ServiceCreate(ServiceBase):
    """Schema for creating a new service."""
    is_active: bool = True


class ServiceUpdate(BaseModel):
    """Schema for updating service data."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    default_price: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    category: Optional[ServiceCategory] = None
    is_active: Optional[bool] = None


class ServiceResponse(ServiceBase):
    """Schema for service response data."""
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ServiceListResponse(BaseModel):
    """Schema for paginated service list."""
    items: list[ServiceResponse]
    total: int
