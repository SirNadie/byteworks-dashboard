"""
PDF Generation Service using ReportLab (Vercel Compatible).
Generates professional PDFs for quotes, invoices, and receipts.
"""

import os
from io import BytesIO
from datetime import datetime
from typing import List, Dict, Any, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER

# --- Configuration ---

COMPANY_INFO = {
    "name": "ByteWorks Agency",
    "tagline": "Digital Solutions",
    "email": "macrodriguez2512@gmail.com",
    "phone": "+1 (868) 775-9858",
    "website": "byteworksagency.com",
}

# Colors
PRIMARY_COLOR = colors.HexColor("#10B981")  # Emerald green
DARK_COLOR = colors.HexColor("#1F2937")
GRAY_COLOR = colors.HexColor("#6B7280")
LIGHT_GRAY = colors.HexColor("#F3F4F6")

# Translations
TRANSLATIONS = {
    "en": {
        "quote": {"title": "QUOTE", "date_label": "Issue Date", "valid_label": "Valid Until"},
        "invoice": {"title": "INVOICE", "date_label": "Invoice Date", "due_label": "Due Date"},
        "receipt": {"title": "PAYMENT RECEIPT", "date_label": "Payment Date"},
        "common": {
            "from": "FROM", "to": "TO", "description": "DESCRIPTION", "qty": "QTY", 
            "price": "PRICE", "total": "TOTAL", "subtotal": "Subtotal", "discount": "Discount", "tax": "Tax",
            "thank_you": "Thank you for your business!"
        },
        "terms_title": "Terms & Conditions",
        "terms": {
            "quote": [
                "Payment of the first month is required to start the service.",
                "This quote is valid for the period specified above.",
                "Services are billed on a monthly or yearly basis unless otherwise specified.",
                "Prices are subject to change with 30 days prior notice.",
                "Cancellation requires 15 days written notice before the next billing cycle.",
                "Late payments beyond 5 days may result in temporary service suspension.",
                "You retain ownership of your content (text, images, customer data). ByteWorks retains rights to the platform code and architecture.",
                "Acceptance of this quote constitutes agreement to ByteWorks Agency's full Terms & Conditions available at byteworksagency.com/terms.",
                "ByteWorks Agency's total liability is limited to the amount paid for services in the current billing period.",
            ],
            "invoice": [
                "Payment is due by the date specified above.",
                "Late payments may incur a 5% monthly late fee after 7 days.",
                "For questions about this invoice, please contact us at the email above.",
            ],
            "receipt": [
                "This is a computer generated receipt.",
                "Thank you for your prompt payment.",
                "Please retain this document for your records.",
            ]
        }
    },
    "es": {
        "quote": {"title": "COTIZACIÓN", "date_label": "Fecha Emisión", "valid_label": "Válido Hasta"},
        "invoice": {"title": "FACTURA", "date_label": "Fecha Factura", "due_label": "Vencimiento"},
        "receipt": {"title": "RECIBO DE PAGO", "date_label": "Fecha Pago"},
        "common": {
            "from": "DE", "to": "PARA", "description": "DESCRIPCIÓN", "qty": "CANT", 
            "price": "PRECIO", "total": "TOTAL", "subtotal": "Subtotal", "discount": "Descuento", "tax": "Impuesto",
            "thank_you": "¡Gracias por su preferencia!"
        },
        "terms_title": "Términos y Condiciones",
        "terms": {
            "quote": [
                "Se requiere el pago del primer mes para iniciar el servicio.",
                "Esta cotización es válida por el período indicado arriba.",
                "Los servicios se facturan mensual o anualmente salvo indicación contraria.",
                "Los precios están sujetos a cambios con 30 días de aviso previo.",
                "La cancelación requiere aviso por escrito con 15 días antes del próximo ciclo.",
                "Pagos atrasados más de 5 días pueden resultar en suspensión temporal del servicio.",
                "Usted conserva la propiedad de su contenido. ByteWorks retiene los derechos del código y arquitectura.",
                "La aceptación de esta cotización constituye acuerdo con los Términos y Condiciones de ByteWorks Agency en byteworksagency.com/terms.",
                "La responsabilidad total de ByteWorks Agency está limitada al monto pagado en el período de facturación actual.",
            ],
            "invoice": [
                "El pago vence en la fecha indicada arriba.",
                "Pagos tardíos pueden generar un recargo del 5% mensual después de 7 días.",
                "Para consultas sobre esta factura, contáctenos al correo indicado.",
            ],
            "receipt": [
                "Este es un recibo generado electrónicamente.",
                "Gracias por su pronto pago.",
                "Por favor conserve este documento para sus registros.",
            ]
        }
    }
}


def _format_currency(amount: float, currency: str = "USD") -> str:
    """Format amount as currency string."""
    symbol = "$" if currency == "USD" else ("TT$" if currency == "TTD" else "€")
    return f"{symbol}{amount:,.2f}"


def _format_date(date_str: Optional[str]) -> str:
    """Format date string to readable format."""
    if not date_str:
        return ""
    try:
        dt = datetime.fromisoformat(str(date_str).replace('Z', '+00:00'))
        return dt.strftime("%b %d, %Y")
    except:
        return str(date_str)[:10] if date_str else ""


def _get_logo_path() -> Optional[str]:
    """Find logo file path."""
    possible_paths = [
        os.path.join(os.getcwd(), 'app', 'assets', 'logo.png'),
        os.path.join(os.getcwd(), 'backend', 'app', 'assets', 'logo.png'),
    ]
    for path in possible_paths:
        if os.path.exists(path):
            return path
    return None


def _create_styles():
    """Create custom paragraph styles."""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        'CompanyName',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=DARK_COLOR,
        spaceAfter=2,
    ))
    
    styles.add(ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=PRIMARY_COLOR,
        alignment=TA_RIGHT,
    ))
    
    styles.add(ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=10,
        textColor=GRAY_COLOR,
        spaceBefore=12,
        spaceAfter=4,
    ))
    
    styles.add(ParagraphStyle(
        'ClientInfo',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_COLOR,
        leading=14,
    ))
    
    styles.add(ParagraphStyle(
        'TermsText',
        parent=styles['Normal'],
        fontSize=8,
        textColor=GRAY_COLOR,
        leading=10,
    ))
    
    styles.add(ParagraphStyle(
        'ThankYou',
        parent=styles['Normal'],
        fontSize=12,
        textColor=PRIMARY_COLOR,
        alignment=TA_CENTER,
        spaceBefore=20,
    ))
    
    return styles


async def _generate_pdf(
    doc_type: str,
    number: str,
    client: Dict[str, str],
    items: List[Dict[str, Any]],
    financials: Dict[str, float],
    dates: Dict[str, str],
    notes: Optional[str] = None,
    language: str = "en"
) -> bytes:
    """Generate PDF document using ReportLab."""
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch
    )
    
    styles = _create_styles()
    t = TRANSLATIONS.get(language, TRANSLATIONS["en"])
    t_doc = t[doc_type]
    t_common = t["common"]
    currency = financials.get("currency", "USD")
    
    elements = []
    
    # --- Header Section ---
    # Left side: Logo + Company name
    company_info_text = f"""
    <b>{COMPANY_INFO['name']}</b><br/>
    <font size="8" color="#6B7280">{COMPANY_INFO['tagline']}</font><br/>
    <font size="8" color="#6B7280">{COMPANY_INFO['email']}</font><br/>
    <font size="8" color="#6B7280">{COMPANY_INFO['phone']}</font>
    """
    company_para = Paragraph(company_info_text, styles['Normal'])
    
    # Right side: Document title and number
    title_text = f"""
    <font size="24" color="#10B981"><b>{t_doc['title']}</b></font><br/>
    <font size="12" color="#1F2937">#{number}</font>
    """
    title_para = Paragraph(title_text, ParagraphStyle('RightAlign', alignment=TA_RIGHT))
    
    header_table = Table([[company_para, title_para]], colWidths=[3.5*inch, 4*inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # --- Date and Client Section ---
    # Dates
    date_primary = _format_date(dates.get("primary"))
    date_secondary = _format_date(dates.get("secondary"))
    
    date_label_1 = t_doc.get("date_label", "Date")
    date_label_2 = t_doc.get("valid_label", t_doc.get("due_label", ""))
    
    dates_text = f"<b>{date_label_1}:</b> {date_primary}"
    if date_secondary and date_label_2:
        dates_text += f"&nbsp;&nbsp;&nbsp;&nbsp;<b>{date_label_2}:</b> {date_secondary}"
    
    elements.append(Paragraph(dates_text, styles['ClientInfo']))
    elements.append(Spacer(1, 0.2*inch))
    
    # Client info
    elements.append(Paragraph(f"<b>{t_common['to']}:</b>", styles['SectionTitle']))
    
    client_name = client.get("name", "Client")
    client_email = client.get("email", "")
    client_phone = client.get("phone", "")
    client_company = client.get("company", "")
    
    client_text = f"<b>{client_name}</b>"
    if client_company:
        client_text += f"<br/>{client_company}"
    if client_email:
        client_text += f"<br/>{client_email}"
    if client_phone:
        client_text += f"<br/>{client_phone}"
    
    elements.append(Paragraph(client_text, styles['ClientInfo']))
    elements.append(Spacer(1, 0.3*inch))
    
    # --- Items Table ---
    table_data = [[
        Paragraph(f"<b>{t_common['description']}</b>", styles['Normal']),
        Paragraph(f"<b>{t_common['qty']}</b>", ParagraphStyle('Center', alignment=TA_CENTER)),
        Paragraph(f"<b>{t_common['price']}</b>", ParagraphStyle('Right', alignment=TA_RIGHT)),
        Paragraph(f"<b>{t_common['total']}</b>", ParagraphStyle('Right', alignment=TA_RIGHT)),
    ]]
    
    for item in items:
        desc = item.get("description", item.get("name", "Item"))
        qty = item.get("quantity", 1)
        price = float(item.get("unit_price", item.get("price", 0)))
        total = float(item.get("total", qty * price))
        
        table_data.append([
            Paragraph(desc, styles['Normal']),
            Paragraph(str(qty), ParagraphStyle('Center', alignment=TA_CENTER)),
            Paragraph(_format_currency(price, currency), ParagraphStyle('Right', alignment=TA_RIGHT)),
            Paragraph(_format_currency(total, currency), ParagraphStyle('Right', alignment=TA_RIGHT)),
        ])
    
    items_table = Table(table_data, colWidths=[3.5*inch, 0.7*inch, 1.3*inch, 1.5*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('TEXTCOLOR', (0, 0), (-1, 0), GRAY_COLOR),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor("#E5E7EB")),
        ('LINEBELOW', (0, 1), (-1, -2), 0.5, colors.HexColor("#F3F4F6")),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor("#E5E7EB")),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # --- Totals Section ---
    subtotal = financials.get("subtotal", 0)
    discount = financials.get("discount", 0)
    tax = financials.get("tax", 0)
    total = financials.get("total", subtotal - discount + tax)
    
    totals_data = []
    totals_data.append(["", f"{t_common['subtotal']}:", _format_currency(subtotal, currency)])
    
    if discount > 0:
        totals_data.append(["", f"{t_common['discount']}:", f"-{_format_currency(discount, currency)}"])
    
    if tax > 0:
        totals_data.append(["", f"{t_common['tax']}:", _format_currency(tax, currency)])
    
    totals_data.append(["", f"<b>{t_common['total']}:</b>", f"<b>{_format_currency(total, currency)}</b>"])
    
    # Convert to paragraphs for styling
    totals_para_data = []
    for row in totals_data:
        totals_para_data.append([
            "",
            Paragraph(row[1], ParagraphStyle('Right', alignment=TA_RIGHT, fontSize=10)),
            Paragraph(row[2], ParagraphStyle('Right', alignment=TA_RIGHT, fontSize=10)),
        ])
    
    totals_table = Table(totals_para_data, colWidths=[4*inch, 1.5*inch, 1.5*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LINEABOVE', (1, -1), (-1, -1), 1, PRIMARY_COLOR),
        ('TEXTCOLOR', (1, -1), (-1, -1), PRIMARY_COLOR),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # --- Notes ---
    if notes:
        elements.append(Paragraph("<b>Notes:</b>", styles['SectionTitle']))
        elements.append(Paragraph(notes, styles['ClientInfo']))
        elements.append(Spacer(1, 0.2*inch))
    
    # --- Terms & Conditions ---
    terms_list = t["terms"].get(doc_type, [])
    if terms_list:
        elements.append(Paragraph(f"<b>{t['terms_title']}</b>", styles['SectionTitle']))
        for term in terms_list:
            elements.append(Paragraph(f"• {term}", styles['TermsText']))
        elements.append(Spacer(1, 0.2*inch))
    
    # --- Thank You ---
    elements.append(Paragraph(t_common["thank_you"], styles['ThankYou']))
    
    # Build PDF
    doc.build(elements)
    
    return buffer.getvalue()


# --- Public Interfaces ---

async def generate_quote_pdf(
    quote_number: str,
    client_name: str,
    client_email: str,
    items: List[Dict[str, Any]],
    subtotal: float,
    total: float,
    currency: str = "USD",
    client_phone: Optional[str] = None,
    client_company: Optional[str] = None,
    discount: float = 0,
    tax: float = 0,
    valid_until: Optional[str] = None,
    created_at: Optional[str] = None,
    notes: Optional[str] = None,
    language: str = "en"
) -> bytes:
    """Generate a Quote PDF."""
    return await _generate_pdf(
        doc_type="quote",
        number=quote_number,
        client={"name": client_name, "email": client_email, "phone": client_phone, "company": client_company},
        items=items,
        financials={"subtotal": subtotal, "total": total, "discount": discount, "tax": tax, "currency": currency},
        dates={"primary": created_at, "secondary": valid_until},
        notes=notes,
        language=language
    )


async def generate_invoice_pdf(
    invoice_number: str,
    client_name: str,
    client_email: str,
    items: List[Dict[str, Any]],
    subtotal: float,
    total: float,
    currency: str = "USD",
    client_phone: Optional[str] = None,
    client_company: Optional[str] = None,
    tax_rate: float = 0,
    tax: float = 0,
    due_date: Optional[str] = None,
    created_at: Optional[str] = None,
    is_paid: bool = False,
    paid_at: Optional[str] = None,
    notes: Optional[str] = None,
    language: str = "en"
) -> bytes:
    """Generate an Invoice PDF."""
    # If paid, generate receipt instead
    if is_paid:
        return await generate_receipt_pdf(
            invoice_number=invoice_number,
            client_name=client_name,
            client_email=client_email,
            client_phone=client_phone,
            client_company=client_company,
            items=items,
            subtotal=subtotal,
            total=total,
            currency=currency,
            tax=tax,
            due_date=due_date,
            paid_at=paid_at,
            notes=notes,
            language=language
        )
    
    return await _generate_pdf(
        doc_type="invoice",
        number=invoice_number,
        client={"name": client_name, "email": client_email, "phone": client_phone, "company": client_company},
        items=items,
        financials={"subtotal": subtotal, "total": total, "discount": 0, "tax": tax, "currency": currency},
        dates={"primary": created_at, "secondary": due_date},
        notes=notes,
        language=language
    )


async def generate_receipt_pdf(
    invoice_number: str,
    client_name: str,
    client_email: str,
    items: List[Dict[str, Any]],
    subtotal: float,
    total: float,
    paid_at: str,
    currency: str = "USD",
    client_phone: Optional[str] = None,
    client_company: Optional[str] = None,
    tax: float = 0,
    due_date: Optional[str] = None,
    notes: Optional[str] = None,
    language: str = "en"
) -> bytes:
    """Generate a Payment Receipt PDF."""
    return await _generate_pdf(
        doc_type="receipt",
        number=invoice_number,
        client={"name": client_name, "email": client_email, "phone": client_phone, "company": client_company},
        items=items,
        financials={"subtotal": subtotal, "total": total, "discount": 0, "tax": tax, "currency": currency},
        dates={"primary": paid_at, "secondary": due_date},
        notes=notes,
        language=language
    )
