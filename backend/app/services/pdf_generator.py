"""
PDF Generation Service using xhtml2pdf (Vercel Friendly).
Generates high-fidelity PDFs using HTML Tables/CSS.
"""

import base64
import os
from io import BytesIO
from datetime import datetime
from typing import List, Dict, Any, Optional
from xhtml2pdf import pisa

# --- Configuration & Assets ---

COMPANY_INFO = {
    "name": "ByteWorks Agency",
    "tagline": "Digital Solutions",
    "email": "macrodriguez2512@gmail.com",
    "phone": "+1 (868) 775-9858",
    "website": "byteworksagency.com",
    # Asegúrate de que este archivo exista en tu backend/app/assets/ o usa un path absoluto válido
    "logo_path": "app/assets/logo.png" 
}

# Translations
TRANSLATIONS = {
    "en": {
        "quote": {"title": "QUOTE", "date_label": "Issue Date", "valid_label": "Valid Until", "due_label": "Due Date"},
        "invoice": {"title": "INVOICE", "date_label": "Invoice Date", "due_label": "Due Date", "valid_label": "Due Date"},
        "receipt": {"title": "PAYMENT RECEIPT", "date_label": "Payment Date", "due_label": "Original Due Date", "valid_label": "Original Due Date"},
        "common": {
            "from": "FROM", "to": "TO", "description": "DESCRIPTION", "qty": "QTY", 
            "price": "PRICE", "total": "TOTAL", "subtotal": "Subtotal", "discount": "Discount", "tax": "Tax"
        },
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
                "ByteWorks Agency's total liability is limited to the amount paid for services in the current billing period."
            ],
            "invoice": [
                "Payment is due by the date specified above.",
                "*Late payments may incur a 5% monthly late fee after 7 days.",
                "*For questions about this invoice, please contact us at the email above.",
                "You retain ownership of your content. ByteWorks retains rights to the platform code."
            ],
            "receipt": [
                "This is a computer generated receipt.",
                "Thank you for your prompt payment.",
                "Please retain this document for your records."
            ]
        }
    },
    "es": {
        "quote": {"title": "COTIZACIÓN", "date_label": "Fecha Emisión", "valid_label": "Válido Hasta", "due_label": "Vencimiento"},
        "invoice": {"title": "FACTURA", "date_label": "Fecha Factura", "due_label": "Vencimiento", "valid_label": "Vencimiento"},
        "receipt": {"title": "RECIBO DE PAGO", "date_label": "Fecha Pago", "due_label": "Vencimiento Orig.", "valid_label": "Vencimiento Orig."},
        "common": {
            "from": "DE", "to": "PARA", "description": "DESCRIPCIÓN", "qty": "CANT", 
            "price": "PRECIO", "total": "TOTAL", "subtotal": "Subtotal", "discount": "Descuento", "tax": "Impuesto"
        },
        "terms": {
            "quote": [
                "Se requiere el pago del primer mes para iniciar.",
                "Esta cotización es válida por el período indicado.",
                "Los servicios se facturan mensual o anualmente.",
                "Precios sujetos a cambios con 30 días de aviso."
            ],
            "invoice": [
                "El pago vence en 15 días.",
                "Pagos tardíos pueden generar un recargo del 5%."
            ],
            "receipt": [
                "Este es un recibo generado electrónicamente.",
                "Gracias por su pronto pago.",
                "Por favor conserve este documento para sus registros."
            ]
        }
    }
}

def _get_logo_base64() -> Optional[str]:
    """Lee el logo desde el disco y lo retorna como base64 string para xhtml2pdf (data URI)."""
    # Intentar varias rutas posibles para robustez en desarrollo/prod
    possible_paths = [
        os.path.join(os.getcwd(), 'app', 'assets', 'logo.png'),
        os.path.join(os.getcwd(), 'backend', 'app', 'assets', 'logo.png'),
        r"C:\Users\Marc\Desktop\ByteWorks\byteworks-dashboard\backend\app\assets\logo.png"
    ]
    
    logo_path = None
    for path in possible_paths:
        if os.path.exists(path):
            logo_path = path
            break
            
    if logo_path:
        try:
            with open(logo_path, "rb") as image_file:
                encoded = base64.b64encode(image_file.read()).decode('utf-8')
                return f"data:image/png;base64,{encoded}"
        except Exception as e:
            print(f"Error reading logo: {e}")
            return None
    return None

def _format_currency(amount: float, currency: str = "USD") -> str:
    symbol = "$" if currency == "USD" else ("TT$" if currency == "TTD" else currency)
    return f"{symbol}{amount:,.2f}"

def _format_date(date_str: Optional[str]) -> str:
    if not date_str:
        return ""
    try:
        # Intentar parsear ISO format
        dt = datetime.fromisoformat(str(date_str).replace('Z', '+00:00'))
        return dt.strftime("%b %d, %Y")
    except:
        return str(date_str)

# --- PDF Generation Functions (Async wrapper for compatibility) ---

async def _generate_pdf_from_html(html_content: str) -> bytes:
    """Combierte HTML a PDF usando xhtml2pdf."""
    pdf_buffer = BytesIO()
    pisa_status = pisa.CreatePDF(BytesIO(html_content.encode('utf-8')), dest=pdf_buffer)
    
    if pisa_status.err:
        print(f"PDF Generation Error: {pisa_status.err}")
        return b""
        
    return pdf_buffer.getvalue()

async def _generate_generic_pdf(
    doc_type: str, 
    number: str,
    client: Dict[str, str],
    items: List[Dict[str, Any]],
    financials: Dict[str, float],
    dates: Dict[str, str],
    notes: Optional[str] = None,
    language: str = "en"
) -> bytes:
    
    t = TRANSLATIONS.get(language, TRANSLATIONS["en"])
    t_doc = t[doc_type]
    t_common = t["common"]
    terms_list = t["terms"][doc_type]
    
    logo_data = _get_logo_base64()
    logo_img = f'<img src="{logo_data}" style="height: 50px; vertical-align: middle;" />' if logo_data else ''

    # Rows
    rows_html = ""
    for item in items:
        qty = item.get("quantity") or 1
        price = item.get("unit_price") or 0
        total = qty * price
        
        rows_html += f"""
        <tr>
            <td class="col-desc">{item.get('description', '')}</td>
            <td class="col-qty">{qty}</td>
            <td class="col-price">{_format_currency(price, financials['currency'])}</td>
            <td class="col-total">{_format_currency(total, financials['currency'])}</td>
        </tr>
        """

    # Extras
    extras_html = ""
    if financials.get('discount'):
        extras_html += f"""
        <tr>
            <td colspan="3" class="text-right label">{t_common['discount']}</td>
            <td class="text-right value color-brand">-{_format_currency(financials['discount'], financials['currency'])}</td>
        </tr>
        """
    if financials.get('tax'):
        extras_html += f"""
        <tr>
            <td colspan="3" class="text-right label">{t_common['tax']}</td>
            <td class="text-right value">{_format_currency(financials['tax'], financials['currency'])}</td>
        </tr>
        """

    notes_section = ""
    if notes:
        notes_section = f"""
        <div class="notes-box">
            <p class="section-title">NOTES</p>
            <p>{notes.replace(chr(10), '<br/>')}</p>
        </div>
        """

    terms_html = "".join([f"<li>{term}</li>" for term in terms_list])

    # Template HTML con CSS inline y tablas para layout (xhtml2pdf friendly)
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @page {{
                size: a4 portrait;
                margin: 2cm;
                @frame footer_frame {{
                    -pdf-frame-content: footerContent;
                    bottom: 1cm;
                    margin-left: 2cm;
                    margin-right: 2cm;
                    height: 1cm;
                }}
            }}
            body {{
                font-family: Helvetica, sans-serif;
                font-size: 11pt;
                color: #333333;
            }}
            .text-right {{ text-align: right; }}
            .text-center {{ text-align: center; }}
            .font-bold {{ font-weight: bold; }}
            .color-brand {{ color: #06b6d4; }}
            .color-gray {{ color: #666666; }}
            .color-light {{ color: #999999; }}
            
            /* Header */
            table.header {{ width: 100%; margin-bottom: 30px; }}
            .company-name {{ font-size: 18pt; font-weight: bold; color: #000; }}
            .tagline {{ font-size: 10pt; color: #888; }}
            
            .doc-title-badge {{
                background-color: #e0faff;
                color: #06b6d4;
                padding: 5px 15px;
                border-radius: 5px;
                font-size: 14pt;
                font-weight: bold;
                text-transform: uppercase;
                display: inline-block;
            }}
            
            /* Two Column Info */
            table.info-grid {{ width: 100%; margin-bottom: 30px; }}
            .info-label {{ 
                font-size: 8pt; 
                font-weight: bold; 
                color: #aaa; 
                text-transform: uppercase; 
                margin-bottom: 5px;
            }}
            .info-value {{ font-size: 10pt; line-height: 1.4; }}
            
            /* Dates Box */
            .dates-box {{
                background-color: #f9fafb;
                border: 1px solid #eeeeee;
                padding: 10px;
                margin-bottom: 30px;
            }}
            table.dates-table {{ width: 100%; }}
            
            /* Items Table */
            table.items {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; }}
            table.items th {{ 
                background-color: #f9fafb; 
                color: #666; 
                font-weight: bold; 
                text-transform: uppercase; 
                font-size: 8pt;
                padding: 10px;
                border-bottom: 1px solid #ddd;
                text-align: left;
            }}
            table.items td {{ 
                padding: 10px; 
                border-bottom: 1px solid #eee; 
                font-size: 10pt;
            }}
            .col-desc {{ width: 50%; }}
            .col-qty {{ width: 10%; text-align: center; }}
            .col-price {{ width: 20%; text-align: right; }}
            .col-total {{ width: 20%; text-align: right; font-weight: bold; }}
            
            /* Totals */
            table.totals {{ width: 100%; margin-bottom: 40px; }}
            table.totals td.label {{ padding: 5px; color: #666; font-size: 10pt; }}
            table.totals td.value {{ padding: 5px; font-weight: bold; font-size: 10pt; }}
            table.totals tr.grand-total td {{ 
                border-top: 1px solid #ddd; 
                padding-top: 10px; 
                font-size: 14pt; 
                color: #06b6d4;
            }}
            
            /* Footer & Notes */
            .notes-box {{ margin-bottom: 20px; }}
            .section-title {{ 
                font-size: 8pt; 
                font-weight: bold; 
                color: #aaa; 
                text-transform: uppercase; 
                margin-bottom: 5px;
            }}
            ul.terms {{ padding-left: 15px; margin: 0; }}
            ul.terms li {{ font-size: 9pt; color: #666; margin-bottom: 3px; }}
            
            #footerContent {{ 
                text-align: center; 
                font-size: 9pt; 
                color: #aaa; 
                border-top: 1px solid #eee;
                padding-top: 10px;
            }}
        </style>
    </head>
    <body>
        <!-- Header -->
        <table class="header">
            <tr>
                <td valign="top">
                    {logo_img}
                    <div class="company-name" style="margin-top: 5px;">{COMPANY_INFO['name']}</div>
                    <div class="tagline">{COMPANY_INFO['tagline']}</div>
                </td>
                <td valign="top" align="right">
                    <div class="doc-title-badge">{t_doc['title']}</div>
                    <div style="margin-top: 5px; color: #666; font-weight: bold;">{number}</div>
                </td>
            </tr>
        </table>
        
        <!-- Info Grid -->
        <table class="info-grid">
            <tr>
                <td valign="top" width="50%">
                    <div class="info-label">{t_common['from']}</div>
                    <div class="info-value">
                        <b>{COMPANY_INFO['name']}</b><br/>
                        {COMPANY_INFO['email']}<br/>
                        {COMPANY_INFO['phone']}<br/>
                        {COMPANY_INFO['website']}
                    </div>
                </td>
                <td valign="top" width="50%">
                    <div class="info-label">{t_common['to']}</div>
                    <div class="info-value">
                        <b>{client.get('name', 'Client')}</b><br/>
                        {client.get('company', '')}<br/>
                        {client.get('email', '')}<br/>
                        {client.get('phone', '')}
                    </div>
                </td>
            </tr>
        </table>
        
        <!-- Dates -->
        <div class="dates-box">
            <table class="dates-table">
                <tr>
                    <td>
                        <span class="color-gray">{t_doc['date_label']}:</span> 
                        <b>{_format_date(dates.get('primary'))}</b>
                    </td>
                    <td>
                        <span class="color-gray">{t_doc['valid_label'] if doc_type == 'quote' else t_doc['due_label']}:</span> 
                        <b>{_format_date(dates.get('secondary'))}</b>
                    </td>
                </tr>
            </table>
        </div>
        
        <!-- Items -->
        <table class="items">
            <thead>
                <tr>
                    <th class="col-desc">{t_common['description']}</th>
                    <th class="col-qty">{t_common['qty']}</th>
                    <th class="col-price">{t_common['price']}</th>
                    <th class="col-total">{t_common['total']}</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>
        
        <!-- Totals -->
        <table class="totals">
            <tr>
                <td width="60%"></td>
                <td width="40%">
                    <table width="100%">
                        <tr>
                            <td class="text-right label">{t_common['subtotal']}</td>
                            <td class="text-right value">{_format_currency(financials['subtotal'], financials['currency'])}</td>
                        </tr>
                        {extras_html}
                        <tr class="grand-total">
                            <td class="text-right label">Total ({financials['currency']})</td>
                            <td class="text-right value">{_format_currency(financials['total'], financials['currency'])}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        <!-- Notes & Terms -->
        {notes_section}
        
        <div class="terms-box">
            <p class="section-title">{language.upper() == 'ES' and 'TÉRMINOS Y CONDICIONES' or 'TERMS & CONDITIONS'}</p>
            <ul class="terms">
                {terms_html}
            </ul>
        </div>
        
        <!-- Footer defined in @page -->
        <div id="footerContent">
            Thank you for your business! - {COMPANY_INFO['website']}
        </div>
    </body>
    </html>
    """
    
    return await _generate_pdf_from_html(html_content)

# --- Public Interfaces (Async Wrapper) ---

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
    
    return await _generate_generic_pdf(
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
    tax_rate: float = 0, # This parameter is not used in the new _generate_generic_pdf financials dict
    tax: float = 0,
    due_date: Optional[str] = None,
    created_at: Optional[str] = None,
    is_paid: bool = False,
    paid_at: Optional[str] = None,
    notes: Optional[str] = None,
    language: str = "en"
) -> bytes:
    
    doc_type = "receipt" if is_paid else "invoice"
    
    pdf_bytes = await _generate_generic_pdf(
        doc_type=doc_type,
        number=invoice_number,
        client={"name": client_name, "email": client_email, "phone": client_phone, "company": client_company},
        items=items,
        financials={"subtotal": subtotal, "total": total, "discount": 0, "tax": tax, "currency": currency}, # Discount not typical on final invoice totals passed here usually
        dates={"primary": paid_at if is_paid else created_at, "secondary": due_date},
        notes=notes,
        language=language
    )
    return pdf_bytes

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
    due_date: Optional[str] = None, # Original Due Date
    notes: Optional[str] = None,
    language: str = "en"
) -> bytes:
    
    return await _generate_generic_pdf(
        doc_type="receipt",
        number=invoice_number,
        client={"name": client_name, "email": client_email, "phone": client_phone, "company": client_company},
        items=items,
        financials={"subtotal": subtotal, "total": total, "discount": 0, "tax": tax, "currency": currency},
        dates={"primary": paid_at, "secondary": due_date},
        notes=notes,
        language=language
    )
