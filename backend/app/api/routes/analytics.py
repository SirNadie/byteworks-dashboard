"""
Analytics routes for dashboard KPIs and statistics.
"""

from datetime import datetime, timedelta, timezone, date
from decimal import Decimal

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select, func, and_

from ..deps import DbSession, CurrentUser
from ...models.contact import Contact
from ...models.quote import Quote, QuoteStatus
from ...models.invoice import Invoice, InvoiceStatus

router = APIRouter()


class DashboardKPIs(BaseModel):
    """Dashboard KPI response."""
    new_contacts: int
    new_contacts_change: float
    pending_quotes: int
    pending_quotes_change: float
    outstanding_invoices: Decimal
    outstanding_change: float
    weekly_visits: int
    visits_change: float


class QuoteStats(BaseModel):
    """Quote status breakdown."""
    draft: int
    sent: int
    accepted: int
    rejected: int
    expired: int
    acceptance_rate: float


class RecentContact(BaseModel):
    """Recent contact for dashboard."""
    id: str
    name: str
    email: str
    source: str
    created_at: datetime


class OverdueInvoice(BaseModel):
    """Overdue invoice for dashboard."""
    id: str
    invoice_number: str
    contact_name: str
    total: Decimal
    due_date: date
    days_overdue: int


class DashboardData(BaseModel):
    """Complete dashboard data."""
    kpis: DashboardKPIs
    quote_stats: QuoteStats
    recent_contacts: list[RecentContact]
    overdue_invoices: list[OverdueInvoice]


@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard_data(db: DbSession, current_user: CurrentUser):
    """Get all dashboard data in a single call."""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)
    today = now.date()
    
    # New contacts (last 7 days)
    new_contacts_result = await db.execute(
        select(func.count(Contact.id)).where(Contact.created_at >= week_ago)
    )
    new_contacts = new_contacts_result.scalar() or 0
    
    prev_contacts_result = await db.execute(
        select(func.count(Contact.id)).where(
            and_(Contact.created_at >= two_weeks_ago, Contact.created_at < week_ago)
        )
    )
    prev_contacts = prev_contacts_result.scalar() or 1
    contacts_change = ((new_contacts - prev_contacts) / max(prev_contacts, 1)) * 100
    
    # Pending quotes
    pending_quotes_result = await db.execute(
        select(func.count(Quote.id)).where(Quote.status == QuoteStatus.SENT)
    )
    pending_quotes = pending_quotes_result.scalar() or 0
    
    # Outstanding invoices
    outstanding_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.OVERDUE])
        )
    )
    outstanding = outstanding_result.scalar() or Decimal("0")
    
    # Quote stats
    quote_stats_result = await db.execute(
        select(Quote.status, func.count(Quote.id)).group_by(Quote.status)
    )
    quote_counts = dict(quote_stats_result.all())
    
    total_quotes = sum(quote_counts.values()) or 1
    accepted = quote_counts.get(QuoteStatus.ACCEPTED, 0)
    
    quote_stats = QuoteStats(
        draft=quote_counts.get(QuoteStatus.DRAFT, 0),
        sent=quote_counts.get(QuoteStatus.SENT, 0),
        accepted=accepted,
        rejected=quote_counts.get(QuoteStatus.REJECTED, 0),
        expired=quote_counts.get(QuoteStatus.EXPIRED, 0),
        acceptance_rate=round((accepted / total_quotes) * 100, 1)
    )
    
    # Recent contacts
    recent_result = await db.execute(
        select(Contact).order_by(Contact.created_at.desc()).limit(5)
    )
    recent_contacts = [
        RecentContact(
            id=str(c.id), name=c.name, email=c.email,
            source=c.source.value, created_at=c.created_at
        )
        for c in recent_result.scalars().all()
    ]
    
    # Overdue invoices
    overdue_result = await db.execute(
        select(Invoice, Contact.name).join(Contact).where(
            and_(Invoice.status == InvoiceStatus.OVERDUE)
        ).order_by(Invoice.due_date.asc()).limit(5)
    )
    
    overdue_invoices = []
    for inv, contact_name in overdue_result.all():
        days = (today - inv.due_date).days
        overdue_invoices.append(OverdueInvoice(
            id=str(inv.id), invoice_number=inv.invoice_number,
            contact_name=contact_name, total=inv.total,
            due_date=inv.due_date, days_overdue=days
        ))
    
    return DashboardData(
        kpis=DashboardKPIs(
            new_contacts=new_contacts, new_contacts_change=round(contacts_change, 1),
            pending_quotes=pending_quotes, pending_quotes_change=0,
            outstanding_invoices=outstanding, outstanding_change=0,
            weekly_visits=1240, visits_change=12.0
        ),
        quote_stats=quote_stats,
        recent_contacts=recent_contacts,
        overdue_invoices=overdue_invoices
    )
