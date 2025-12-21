# API Routes
from fastapi import APIRouter

from . import auth, contacts, quotes, invoices, analytics, services, public

# Main API router
api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(contacts.router, prefix="/contacts", tags=["Contacts"])
api_router.include_router(services.router, prefix="/services", tags=["Services"])
api_router.include_router(quotes.router, prefix="/quotes", tags=["Quotes"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])

# Public routes (no authentication required) - for PDF downloads
api_router.include_router(public.router, prefix="/public", tags=["Public"])

