"""
Public routes for accessing PDFs without authentication.
These endpoints allow clients to download their quotes and invoices via direct links.
"""

from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from io import BytesIO

from ...models.quote import Quote
from ...models.invoice import Invoice
from ...core.config import settings
from ...core.rate_limiter import limiter
from ...core.security import verify_url_signature
from ...core.database import async_session_maker
from ...services.pdf_generator import generate_quote_pdf, generate_invoice_pdf, generate_receipt_pdf


router = APIRouter()


@router.get("/quote/{quote_id}/pdf")
@limiter.limit(settings.rate_limit_public)
async def download_quote_pdf(
    request: Request,
    quote_id: UUID,
    expires: int = Query(..., description="Expiration timestamp"),
    signature: str = Query(..., description="HMAC signature"),
    lang: str = Query("en", description="Language: en or es")
):
    """
    Generate and download a Quote PDF.
    Requires a signed URL.
    """
    # Verify Signature
    path = f"/api/public/quote/{quote_id}/pdf" # Must match exactly what was signed
    # Note: If running behind a proxy or prefix, ensure this matches.
    # Our create_signed_query_params logic uses the path provided to it.
    
    if not verify_url_signature(path, expires, signature):
        raise HTTPException(status_code=403, detail="Invalid or expired link")

    async with async_session_maker() as session:
        result = await session.execute(
            select(Quote).where(Quote.id == quote_id)
        )
        quote = result.scalar_one_or_none()
        
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        # Generate PDF
        items = quote.items_json or quote.items or []
        
        try:
            pdf_bytes = await generate_quote_pdf(
                quote_number=quote.quote_number,
                client_name=quote.client_name,
                client_email=quote.client_email,
                client_phone=quote.client_phone,
                client_company=quote.client_company,
                items=items,
                subtotal=float(quote.subtotal or 0),
                discount=float(quote.discount or 0),
                tax=float(quote.tax or 0),
                total=float(quote.total or 0),
                currency=quote.currency or "USD",
                valid_until=str(quote.valid_until) if quote.valid_until else None,
                notes=quote.notes,
                created_at=str(quote.created_at) if quote.created_at else None,
                language=lang
            )
        except ImportError as e:
            raise HTTPException(
                status_code=503,
                detail="PDF generation is not available on this server. Please download the PDF from the dashboard."
            )
        
        if not pdf_bytes:
            raise HTTPException(status_code=500, detail="Failed to generate PDF")
        
        # Return as downloadable PDF
        filename = f"Quote-{quote.quote_number}.pdf"
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes))
            }
        )


@router.get("/invoice/{invoice_id}/pdf")
@limiter.limit(settings.rate_limit_public)
async def download_invoice_pdf(
    request: Request,
    invoice_id: UUID,
    expires: int = Query(..., description="Expiration timestamp"),
    signature: str = Query(..., description="HMAC signature"),
    lang: str = Query("en", description="Language: en or es")
):
    """
    Generate and download an Invoice PDF.
    Requires a signed URL.
    """
    # Verify Signature
    path = f"/api/public/invoice/{invoice_id}/pdf"
    
    if not verify_url_signature(path, expires, signature):
        raise HTTPException(status_code=403, detail="Invalid or expired link")

    async with async_session_maker() as session:
        result = await session.execute(
            select(Invoice)
            .options(selectinload(Invoice.contact))
            .where(Invoice.id == invoice_id)
        )
        invoice = result.scalar_one_or_none()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Get client info
        client_name = "Client"
        client_email = ""
        client_phone = None
        client_company = None
        
        if invoice.contact:
            client_name = invoice.contact.name
            client_email = invoice.contact.email
            client_phone = invoice.contact.phone
            client_company = invoice.contact.company
        
        # Get items
        items = invoice.items or []
        
        # Check if paid
        is_paid = invoice.status.value == "paid" if hasattr(invoice.status, 'value') else invoice.status == "paid"
        
        try:
            pdf_bytes = await generate_invoice_pdf(
                invoice_number=invoice.invoice_number,
                client_name=client_name,
                client_email=client_email,
                client_phone=client_phone,
                client_company=client_company,
                items=items,
                subtotal=float(invoice.subtotal or 0),
                tax_rate=float(invoice.tax_rate or 0),
                tax=float(invoice.tax or 0),
                total=float(invoice.total or 0),
                currency="USD",
                due_date=str(invoice.due_date) if invoice.due_date else None,
                created_at=str(invoice.created_at) if invoice.created_at else None,
                notes=invoice.notes,
                is_paid=is_paid,
                paid_at=str(invoice.paid_at) if invoice.paid_at else None,
                language=lang
            )
        except ImportError as e:
            raise HTTPException(
                status_code=503,
                detail="PDF generation is not available on this server. Please download the PDF from the dashboard."
            )
        
        if not pdf_bytes:
            raise HTTPException(status_code=500, detail="Failed to generate PDF")
        
        # Return as downloadable PDF
        filename = f"Invoice-{invoice.invoice_number}.pdf"
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes))
            }
        )


@router.get("/receipt/{invoice_id}/pdf")
@limiter.limit(settings.rate_limit_public)
async def download_receipt_pdf(
    request: Request,
    invoice_id: UUID,
    expires: int = Query(..., description="Expiration timestamp"),
    signature: str = Query(..., description="HMAC signature"),
    lang: str = Query("en", description="Language: en or es")
):
    """
    Generate and download a Payment Receipt PDF.
    Requires a signed URL.
    """
    # Verify Signature
    path = f"/api/public/receipt/{invoice_id}/pdf"
    
    if not verify_url_signature(path, expires, signature):
        raise HTTPException(status_code=403, detail="Invalid or expired link")

    async with async_session_maker() as session:
        result = await session.execute(
            select(Invoice)
            .options(selectinload(Invoice.contact))
            .where(Invoice.id == invoice_id)
        )
        invoice = result.scalar_one_or_none()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Get client info
        client_name = "Client"
        client_email = ""
        client_phone = None
        client_company = None
        
        if invoice.contact:
            client_name = invoice.contact.name
            client_email = invoice.contact.email
            client_phone = invoice.contact.phone
            client_company = invoice.contact.company
        
        # Get items
        items = invoice.items or []
        
        # Use paid_at or current time if not set (though it should be for a receipt)
        # Note: Need datetime import if using current time fallback, but assuming paid_at is present for paid invoices
        paid_at_str = str(invoice.paid_at) if invoice.paid_at else str(invoice.updated_at or invoice.created_at)
        
        try:
            pdf_bytes = await generate_receipt_pdf(
                invoice_number=invoice.invoice_number,
                client_name=client_name,
                client_email=client_email,
                client_phone=client_phone,
                client_company=client_company,
                items=items,
                subtotal=float(invoice.subtotal or 0),
                total=float(invoice.total or 0),
                currency="USD",
                tax=float(invoice.tax or 0),
                due_date=str(invoice.due_date) if invoice.due_date else None,
                paid_at=paid_at_str,
                notes=invoice.notes,
                language=lang
            )
        except ImportError as e:
            raise HTTPException(
                status_code=503,
                detail="PDF generation is not available on this server. Please download the PDF from the dashboard."
            )
        
        if not pdf_bytes:
            raise HTTPException(status_code=500, detail="Failed to generate PDF")
        
        filename = f"Receipt-{invoice.invoice_number}.pdf"
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes))
            }
        )
        invoice = result.scalar_one_or_none()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Get client info
        client_name = "Client"
        client_email = ""
        client_phone = None
        client_company = None
        
        if invoice.contact:
            client_name = invoice.contact.name
            client_email = invoice.contact.email
            client_phone = invoice.contact.phone
            client_company = invoice.contact.company
        
        items = invoice.items or []
        
        # Use paid_at or current time if not set (though it should be for a receipt)
        # Note: Need datetime import if using current time fallback, but assuming paid_at is present for paid invoices
        paid_at_str = str(invoice.paid_at) if invoice.paid_at else str(invoice.updated_at or invoice.created_at)
        
        try:
            pdf_bytes = await generate_receipt_pdf(
                invoice_number=invoice.invoice_number,
                client_name=client_name,
                client_email=client_email,
                client_phone=client_phone,
                client_company=client_company,
                items=items,
                subtotal=float(invoice.subtotal or 0),
                total=float(invoice.total or 0),
                currency="USD",
                tax=float(invoice.tax or 0),
                due_date=str(invoice.due_date) if invoice.due_date else None,
                paid_at=paid_at_str,
                notes=invoice.notes,
                language=lang
            )
        except ImportError as e:
            raise HTTPException(
                status_code=503,
                detail="PDF generation is not available on this server. Please download the PDF from the dashboard."
            )
        
        if not pdf_bytes:
            raise HTTPException(status_code=500, detail="Failed to generate PDF")
        
        filename = f"Receipt-{invoice.invoice_number}.pdf"
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes))
            }
        )
