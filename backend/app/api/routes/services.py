"""
Service routes for CRUD operations on the service catalog.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select, func

from ..deps import DbSession, CurrentUser
from ...models.service import Service, ServiceCategory
from ...schemas.service import (
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse,
    ServiceListResponse,
)

router = APIRouter()


@router.get("", response_model=ServiceListResponse)
async def list_services(
    db: DbSession,
    current_user: CurrentUser,
    category: Optional[ServiceCategory] = None,
    active_only: bool = True,
):
    """
    List all services in the catalog.
    
    Args:
        db: Database session
        current_user: Current authenticated user
        category: Filter by category
        active_only: Only show active services
        
    Returns:
        List of services
    """
    query = select(Service)
    count_query = select(func.count(Service.id))
    
    if active_only:
        query = query.where(Service.is_active == True)
        count_query = count_query.where(Service.is_active == True)
    
    if category:
        query = query.where(Service.category == category)
        count_query = count_query.where(Service.category == category)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Get results ordered by name
    query = query.order_by(Service.name)
    result = await db.execute(query)
    services = result.scalars().all()
    
    return ServiceListResponse(
        items=[ServiceResponse.model_validate(s) for s in services],
        total=total,
    )


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    """Get a specific service by ID."""
    result = await db.execute(
        select(Service).where(Service.id == service_id)
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    return ServiceResponse.model_validate(service)


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    service_data: ServiceCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Create a new service in the catalog.
    """
    new_service = Service(
        name=service_data.name,
        description=service_data.description,
        default_price=service_data.default_price,
        currency=service_data.currency,
        category=service_data.category,
        is_active=service_data.is_active,
    )
    
    db.add(new_service)
    await db.flush()
    await db.refresh(new_service)
    
    return ServiceResponse.model_validate(new_service)


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: UUID,
    service_data: ServiceUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    """Update an existing service."""
    result = await db.execute(
        select(Service).where(Service.id == service_id)
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Update only provided fields
    update_data = service_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)
    
    await db.flush()
    await db.refresh(service)
    
    return ServiceResponse.model_validate(service)


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    """Delete a service (soft delete by setting is_active=False)."""
    result = await db.execute(
        select(Service).where(Service.id == service_id)
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Soft delete
    service.is_active = False
    await db.flush()
