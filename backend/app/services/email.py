"""
Email service for sending notifications via Gmail SMTP.
This is the notification channel - can be replaced with WhatsApp later.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import asyncio

from ..core.config import settings


class EmailClient:
    """Client for sending emails via Gmail SMTP."""
    
    SMTP_SERVER = "smtp.gmail.com"
    SMTP_PORT = 587
    
    def __init__(self):
        self.gmail_address = settings.gmail_address
        self.gmail_app_password = settings.gmail_app_password
        self.notification_email = settings.notification_email
    
    def is_configured(self) -> bool:
        """Check if email is properly configured."""
        return bool(self.gmail_address and self.gmail_app_password)
    
    def _send_email_sync(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None
    ) -> bool:
        """Send email synchronously (runs in thread pool)."""
        if not self.is_configured():
            print("⚠️ Gmail not configured, skipping email...")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"ByteWorks CRM <{self.gmail_address}>"
            msg["To"] = to_email
            
            # Add text and HTML parts
            if body_text:
                msg.attach(MIMEText(body_text, "plain"))
            msg.attach(MIMEText(body_html, "html"))
            
            # Send via SMTP
            with smtplib.SMTP(self.SMTP_SERVER, self.SMTP_PORT) as server:
                server.starttls()
                server.login(self.gmail_address, self.gmail_app_password)
                server.send_message(msg)
            
            print(f"✅ Email sent to: {to_email}")
            return True
            
        except Exception as e:
            print(f"❌ Email failed: {e}")
            return False
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None
    ) -> bool:
        """Send email asynchronously."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._send_email_sync,
            to_email,
            subject,
            body_html,
            body_text
        )
    
    async def send_notification(
        self,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None
    ) -> bool:
        """Send notification email to the configured notification address."""
        if not self.notification_email:
            print("⚠️ Notification email not configured")
            return False
        return await self.send_email(self.notification_email, subject, body_html, body_text)


# Global client instance
email_client = EmailClient()


# ==================== NOTIFICATION TEMPLATES ====================

async def notify_new_lead(
    name: str,
    email: str,
    phone: Optional[str],
    company: Optional[str],
    message: Optional[str],
    contact_method: str = "email"
) -> bool:
    """Send notification when a new lead is received."""
    
    method_emoji = "📱" if contact_method == "whatsapp" else "📧"
    method_label = "WhatsApp" if contact_method == "whatsapp" else "Email"
    
    subject = f"🆕 New Lead: {name}" + (f" from {company}" if company else "")
    
    first_name = name.split()[0] if name else "there"
    
    # Ready-to-send message based on contact method
    if contact_method == "whatsapp" and phone:
        ready_message = f"""Hi {first_name}! 👋

Thanks for reaching out to ByteWorks Agency!

I'm reviewing your request and will get back to you shortly with more details.

Is there a specific time that works best for a call?

Best regards,
Marc - ByteWorks Agency"""
    else:
        ready_message = f"""Hi {first_name}! 👋

Thanks for reaching out to ByteWorks Agency!

I'm reviewing your request and will get back to you shortly with more details.

If you have any questions in the meantime, feel free to reply to this email.

Best regards,
Marc - ByteWorks Agency"""
    
    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; }}
            .field {{ margin: 10px 0; }}
            .label {{ font-weight: bold; color: #6c757d; }}
            .value {{ color: #212529; }}
            .message-box {{ background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }}
            .ready-message {{ background: #e8f4fd; padding: 15px; border-radius: 8px; margin-top: 20px; }}
            .ready-message pre {{ white-space: pre-wrap; font-family: inherit; margin: 0; }}
            .contact-btn {{ display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }}
            .footer {{ text-align: center; padding: 15px; color: #6c757d; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin:0;">🆕 New Lead Received!</h2>
            </div>
            <div class="content">
                <div class="field">
                    <span class="label">👤 Name:</span>
                    <span class="value">{name}</span>
                </div>
                <div class="field">
                    <span class="label">🏢 Company:</span>
                    <span class="value">{company or 'Not provided'}</span>
                </div>
                <div class="field">
                    <span class="label">{method_emoji} Preferred Contact:</span>
                    <span class="value">{method_label}</span>
                </div>
                <div class="field">
                    <span class="label">📧 Email:</span>
                    <span class="value">{email}</span>
                </div>
                <div class="field">
                    <span class="label">📱 Phone:</span>
                    <span class="value">{phone or 'Not provided'}</span>
                </div>
                
                <div class="message-box">
                    <span class="label">📝 Message:</span>
                    <p>{message or 'No message provided'}</p>
                </div>
                
                <div class="ready-message">
                    <strong>📝 Ready-to-send message:</strong>
                    <pre>{ready_message}</pre>
                </div>
                
                <div style="margin-top: 20px;">
                    <a href="mailto:{email}" class="contact-btn">📧 Reply via Email</a>
                    {"<a href='https://wa.me/" + (phone.replace('+', '').replace(' ', '').replace('-', '') if phone else '') + "' class='contact-btn' style='margin-left: 10px;'>📱 WhatsApp</a>" if phone else ""}
                </div>
            </div>
            <div class="footer">
                ByteWorks CRM • Automated Notification
            </div>
        </div>
    </body>
    </html>
    """
    
    return await email_client.send_notification(subject, body_html)


async def notify_new_quote(
    quote_number: str,
    client_name: str,
    client_email: str,
    client_phone: Optional[str],
    client_company: Optional[str],
    total: float,
    currency: str,
    valid_until: str,
    pdf_link: Optional[str] = None
) -> bool:
    """Send notification when a quote is created/sent."""
    
    currency_symbol = "$" if currency == "USD" else "TT$"
    first_name = client_name.split()[0] if client_name else "there"
    
    subject = f"📋 Quote {quote_number} - {currency_symbol}{total:,.2f} for {client_name}"
    
    # Message to copy
    ready_message = f"""Hi {first_name}! 👋

As discussed, I'm sending you the quote for your project.

📋 Quote: {quote_number}
💰 Total: {currency_symbol}{total:,.2f} {currency}
📅 Valid until: {valid_until}

📄 You can view and download the quote here:
{pdf_link or '[PDF LINK]'}

Please review it and let me know if you have any questions or need adjustments.

Looking forward to working with you!

Best regards,
Marc - ByteWorks Agency"""
    
    pdf_section = ""
    if pdf_link:
        pdf_section = f"""
        <div class="field">
            <span class="label">📄 PDF Link:</span>
            <div style="margin-top: 5px;">
                <a href="{pdf_link}" style="color: #3498db; text-decoration: none; word-break: break-all;">{pdf_link}</a>
            </div>
        </div>
        """
    
    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; }}
            .field {{ margin: 10px 0; }}
            .label {{ font-weight: bold; color: #6c757d; }}
            .value {{ color: #212529; }}
            .total-box {{ background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }}
            .total-amount {{ font-size: 28px; font-weight: bold; color: #3498db; }}
            .ready-message {{ background: #e8f4fd; padding: 15px; border-radius: 8px; margin-top: 20px; }}
            .ready-message pre {{ white-space: pre-wrap; font-family: inherit; margin: 0; }}
            .footer {{ text-align: center; padding: 15px; color: #6c757d; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin:0;">📋 Quote Created</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">{quote_number}</p>
            </div>
            <div class="content">
                <div class="total-box">
                    <div style="color: #6c757d; margin-bottom: 5px;">Total Amount</div>
                    <div class="total-amount">{currency_symbol}{total:,.2f} {currency}</div>
                    <div style="color: #6c757d; margin-top: 5px;">Valid until: {valid_until}</div>
                </div>
                
                {pdf_section}
                
                <div class="field">
                    <span class="label">👤 Client:</span>
                    <span class="value">{client_name}</span>
                </div>
                <div class="field">
                    <span class="label">🏢 Company:</span>
                    <span class="value">{client_company or 'N/A'}</span>
                </div>
                <div class="field">
                    <span class="label">📧 Email:</span>
                    <span class="value">{client_email}</span>
                </div>
                <div class="field">
                    <span class="label">📱 Phone:</span>
                    <span class="value">{client_phone or 'N/A'}</span>
                </div>
                
                <div class="ready-message">
                    <strong>📝 Message for client (copy & send):</strong>
                    <pre>{ready_message}</pre>
                </div>
            </div>
            <div class="footer">
                ByteWorks CRM • Automated Notification
            </div>
        </div>
    </body>
    </html>
    """
    
    return await email_client.send_notification(subject, body_html)


async def notify_payment_received(
    invoice_number: str,
    client_name: str,
    amount: float,
    currency: str,
    method: str,
    receipt_link: Optional[str] = None
) -> bool:
    """Send notification when a payment is received."""
    
    currency_symbol = "$" if currency == "USD" else "TT$"
    first_name = client_name.split()[0] if client_name else "there"
    
    subject = f"💰 Payment Received: {currency_symbol}{amount:,.2f} from {client_name}"
    
    # Ready-to-send message for client
    ready_message = f"""Hi {first_name}! 👋
    
    Thank you for your payment of {currency_symbol}{amount:,.2f} for Invoice {invoice_number}.
    
    You can download your payment receipt here:
    {receipt_link or '[RECEIPT LINK]'}
    
    We appreciate your business!
    
    Best regards,
    Marc - ByteWorks Agency"""

    pdf_section = ""
    if receipt_link:
        pdf_section = f"""
        <div class="field">
            <span class="label">📄 Receipt Link:</span>
            <div style="margin-top: 5px;">
                <a href="{receipt_link}" style="color: #27ae60; text-decoration: none; word-break: break-all;">{receipt_link}</a>
            </div>
        </div>
        """

    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; }}
            .amount-box {{ background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }}
            .amount {{ font-size: 32px; font-weight: bold; color: #27ae60; }}
            .field {{ margin: 10px 0; }}
            .label {{ font-weight: bold; color: #6c757d; }}
            .value {{ color: #212529; }}
            .ready-message {{ background: #e8fdf5; padding: 15px; border-radius: 8px; margin-top: 20px; }}
            .ready-message pre {{ white-space: pre-wrap; font-family: inherit; margin: 0; }}
            .footer {{ text-align: center; padding: 15px; color: #6c757d; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin:0;">💰 Payment Received!</h2>
            </div>
            <div class="content">
                <div class="amount-box">
                    <div class="amount">{currency_symbol}{amount:,.2f}</div>
                    <div style="color: #6c757d; margin-top: 5px;">{currency}</div>
                </div>
                
                {pdf_section}

                <div class="field">
                    <span class="label">📄 Invoice:</span>
                    <span class="value">{invoice_number}</span>
                </div>
                <div class="field">
                    <span class="label">👤 Client:</span>
                    <span class="value">{client_name}</span>
                </div>
                <div class="field">
                    <span class="label">💳 Method:</span>
                    <span class="value">{method}</span>
                </div>

                <div class="ready-message">
                    <strong>📝 Message for client (copy & send):</strong>
                    <pre>{ready_message}</pre>
                </div>
            </div>
            <div class="footer">
                ByteWorks CRM • Automated Notification
            </div>
        </div>
    </body>
    </html>
    """
    
    return await email_client.send_notification(subject, body_html)


async def send_client_drive_link(
    client_email: str,
    client_name: str,
    drive_link: str
) -> bool:
    """Send email to client with their Google Drive folder link."""
    
    first_name = client_name.split()[0] if client_name else "there"
    
    subject = f"Your Project Folder is Ready - ByteWorks"
    
    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }}
            .content {{ background: #ffffff; padding: 30px; border: 1px solid #e9ecef; }}
            .drive-box {{ background: #f8f9fa; padding: 25px; border-radius: 8px; text-align: center; margin: 25px 0; }}
            .drive-btn {{ display: inline-block; padding: 15px 30px; background: #4285f4; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }}
            .list {{ margin: 20px 0; padding-left: 20px; }}
            .list li {{ margin: 8px 0; }}
            .footer {{ text-align: center; padding: 20px; color: #6c757d; font-size: 12px; background: #f8f9fa; border-radius: 0 0 10px 10px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin:0;">📁 Your Project Folder</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">is ready!</p>
            </div>
            <div class="content">
                <p>Hi {first_name}! 👋</p>
                
                <p>Your project is confirmed! I've created a private folder where you can share any files needed for your project.</p>
                
                <div class="drive-box">
                    <p style="margin-bottom: 15px; color: #6c757d;">Click below to access your folder:</p>
                    <a href="{drive_link}" class="drive-btn">📁 Open Google Drive Folder</a>
                </div>
                
                <p><strong>You can upload:</strong></p>
                <ul class="list">
                    <li>🖼️ Logos and images</li>
                    <li>📄 Documents and content</li>
                    <li>🎨 Brand guidelines</li>
                    <li>📦 Any other project assets</li>
                </ul>
                
                <p>Simply drag and drop your files into the folder, and I'll have access to them immediately.</p>
                
                <p>If you have any questions, just reply to this email!</p>
                
                <p style="margin-top: 30px;">
                    Best regards,<br>
                    <strong>Marc Rodriguez</strong><br>
                    ByteWorks Agency
                </p>
            </div>
            <div class="footer">
                ByteWorks Agency • Building Digital Solutions
            </div>
        </div>
    </body>
    </html>
    """
    
    body_text = f"""Hi {first_name}!

Your project is confirmed! I've created a private folder where you can share any files needed for your project.

📁 Access your folder here: {drive_link}

You can upload:
- Logos and images
- Documents and content
- Brand guidelines
- Any other project assets

Simply drag and drop your files into the folder, and I'll have access to them immediately.

If you have any questions, just reply to this email!

Best regards,
Marc Rodriguez
ByteWorks Agency
"""
    
    return await email_client.send_email(client_email, subject, body_html, body_text)


async def notify_new_invoice(
    invoice_number: str,
    client_name: str,
    client_email: str,
    client_phone: Optional[str],
    client_company: Optional[str],
    total: float,
    currency: str,
    due_date: str,
    pdf_link: Optional[str] = None
) -> bool:
    """Send notification when an invoice is created."""
    
    currency_symbol = "$" if currency == "USD" else "TT$"
    first_name = client_name.split()[0] if client_name else "there"
    
    subject = f"🧾 Invoice {invoice_number} - {currency_symbol}{total:,.2f} for {client_name}"
    
    # Message to copy
    ready_message = f"""Hi {first_name}! 👋
    
    Please find attached invoice {invoice_number} for {currency_symbol}{total:,.2f}.
    
    🧾 Invoice: {invoice_number}
    💰 Total: {currency_symbol}{total:,.2f} {currency}
    📅 Due Date: {due_date}
    
    📄 You can view and download the invoice here:
    {pdf_link or '[PDF LINK]'}
    
    Please let me know if you have any questions. 
    
    Thank you for your business!
    
    Best regards,
    Marc - ByteWorks Agency"""
    
    pdf_section = ""
    if pdf_link:
        pdf_section = f"""
        <div class="field">
            <span class="label">📄 PDF Link:</span>
            <div style="margin-top: 5px;">
                <a href="{pdf_link}" style="color: #3498db; text-decoration: none; word-break: break-all;">{pdf_link}</a>
            </div>
        </div>
        """
    
    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #e67e22 0%, #d35400 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; }}
            .field {{ margin: 10px 0; }}
            .label {{ font-weight: bold; color: #6c757d; }}
            .value {{ color: #212529; }}
            .total-box {{ background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }}
            .total-amount {{ font-size: 28px; font-weight: bold; color: #e67e22; }}
            .ready-message {{ background: #fff5eb; padding: 15px; border-radius: 8px; margin-top: 20px; }}
            .ready-message pre {{ white-space: pre-wrap; font-family: inherit; margin: 0; }}
            .footer {{ text-align: center; padding: 15px; color: #6c757d; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin:0;">🧾 Invoice Created</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">{invoice_number}</p>
            </div>
            <div class="content">
                <div class="total-box">
                    <div style="color: #6c757d; margin-bottom: 5px;">Total Amount Due</div>
                    <div class="total-amount">{currency_symbol}{total:,.2f} {currency}</div>
                    <div style="color: #6c757d; margin-top: 5px;">Due Date: {due_date}</div>
                </div>
                
                {pdf_section}
                
                <div class="field">
                    <span class="label">👤 Client:</span>
                    <span class="value">{client_name}</span>
                </div>
                <div class="field">
                    <span class="label">🏢 Company:</span>
                    <span class="value">{client_company or 'N/A'}</span>
                </div>
                
                <div class="ready-message">
                    <strong>📝 Message for client (copy & send):</strong>
                    <pre>{ready_message}</pre>
                </div>
            </div>
            <div class="footer">
                ByteWorks CRM • Automated Notification
            </div>
        </div>
    </body>
    </html>
    """
    
    # Send only to notification email (Marc), not the client directly
    return await email_client.send_notification(subject, body_html)
