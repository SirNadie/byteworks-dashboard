"""
Contact routes for CRUD operations on clients and leads.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select, func

from ..deps import DbSession, CurrentUser
from ...models.contact import Contact, ContactStatus, ContactSource
from ...schemas.contact import (
    ContactCreate,
    ContactUpdate,
    ContactResponse,
    ContactListResponse,
    PublicContactRequest,
)

router = APIRouter()


@router.get("", response_model=ContactListResponse)
async def list_contacts(
    db: DbSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[ContactStatus] = None,
    statuses: Optional[str] = Query(None, description="Comma-separated list of statuses to filter by"),
    search: Optional[str] = None,
):
    """
    List all contacts with pagination and optional filtering.
    
    Args:
        db: Database session
        current_user: Current authenticated user
        page: Page number (1-indexed)
        size: Items per page
        status: Filter by single contact status (deprecated, use statuses)
        statuses: Comma-separated list of statuses (e.g., "NEW,drafting")
        search: Search in name, email, or company
        
    Returns:
        Paginated list of contacts
    """
    # Build base query
    query = select(Contact)
    count_query = select(func.count(Contact.id))
    
    # Apply filters - support multiple statuses
    if statuses:
        # Parse comma-separated statuses
        status_list = []
        for s in statuses.split(","):
            s = s.strip()
            try:
                status_list.append(ContactStatus(s))
            except ValueError:
                pass  # Ignore invalid status values
        
        if status_list:
            query = query.where(Contact.status.in_(status_list))
            count_query = count_query.where(Contact.status.in_(status_list))
    elif status:
        query = query.where(Contact.status == status)
        count_query = count_query.where(Contact.status == status)
    
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Contact.name.ilike(search_filter)) |
            (Contact.email.ilike(search_filter)) |
            (Contact.company.ilike(search_filter))
        )
        count_query = count_query.where(
            (Contact.name.ilike(search_filter)) |
            (Contact.email.ilike(search_filter)) |
            (Contact.company.ilike(search_filter))
        )
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Calculate pagination
    pages = (total + size - 1) // size if total > 0 else 1
    offset = (page - 1) * size
    
    # Get paginated results
    query = query.order_by(Contact.created_at.desc()).offset(offset).limit(size)
    result = await db.execute(query)
    contacts = result.scalars().all()
    
    return ContactListResponse(
        items=[ContactResponse.model_validate(c) for c in contacts],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


# NOTE: The /public route is defined BELOW, before the /{contact_id} routes,
# to ensure proper routing order. In FastAPI, routes with path parameters
# can intercept static paths if defined first.

@router.post("/public", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_public_contact(
    contact_data: PublicContactRequest,
    db: DbSession,
):
    """
    Create a new contact from public website (honeypot protected).
    Creates entry in Notion and sends email notification.
    """
    if contact_data.bot_field:
        # Honeypot triggered, return fake success
        from uuid import UUID
        from datetime import datetime, timezone
        
        return ContactResponse(
            id=UUID('00000000-0000-0000-0000-000000000000'),
            name="Bot Filtered",
            email="bot@honeypot.com",
            source=ContactSource.OTHER,
            status=ContactStatus.NEW,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            phone=None,
            company=None,
            notes=None
        )

    # Determine contact method from data
    from ...models.contact import ContactMethod
    contact_method = None
    if hasattr(contact_data, 'contact_method') and contact_data.contact_method:
        try:
            contact_method = ContactMethod(contact_data.contact_method)
        except ValueError:
            pass

    # Manual mapping since schemas differ
    new_contact = Contact(
        name=contact_data.name,
        email=contact_data.email,
        phone=contact_data.phone,
        notes=contact_data.message,
        source=ContactSource.WEB_FORM,
        status=ContactStatus.NEW,
        contact_method=contact_method
    )
    
    db.add(new_contact)
    await db.flush()
    await db.refresh(new_contact)
    
    # Send to Notion + Email notification (replacing Discord)
    from ...services.notifications import notify_new_lead
    try:
        result = await notify_new_lead(
            name=new_contact.name,
            email=new_contact.email,
            phone=new_contact.phone,
            company=new_contact.company,
            message=new_contact.notes,
            contact_method=contact_method.value if contact_method else "email",
            crm_id=None  # Could pass contact ID if needed
        )
        if result.get("notion_page_id"):
            print(f"✅ Created lead in Notion: {new_contact.email}")
        if result.get("notification_sent"):
            print(f"✅ Sent email notification for lead: {new_contact.email}")
    except Exception as e:
        print(f"❌ Failed to process lead notification: {e}")

    return ContactResponse.model_validate(new_contact)


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Get a specific contact by ID.
    
    Args:
        contact_id: Contact UUID
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Contact data
    """
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id)
    )
    contact = result.scalar_one_or_none()
    
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
    
    return ContactResponse.model_validate(contact)


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    contact_data: ContactCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Create a new contact.
    
    Args:
        contact_data: Contact creation data
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Created contact data
    """
    contact = Contact(**contact_data.model_dump())
    db.add(contact)
    await db.flush()
    await db.refresh(contact)
    
    return ContactResponse.model_validate(contact)


@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: UUID,
    contact_data: ContactUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Update an existing contact.
    
    Args:
        contact_id: Contact UUID
        contact_data: Contact update data
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Updated contact data
    """
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id)
    )
    contact = result.scalar_one_or_none()
    
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
    
    # Update only provided fields
    update_data = contact_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contact, field, value)
    
    await db.flush()
    await db.refresh(contact)
    
    return ContactResponse.model_validate(contact)



@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Delete a contact.
    
    Args:
        contact_id: Contact UUID
        db: Database session
        current_user: Current authenticated user
    """
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id)
    )
    contact = result.scalar_one_or_none()
    
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
    
    await db.delete(contact)
