"""
Discord webhook service for sending notifications.
"""

import httpx
from typing import Optional

from ..core.config import settings


def get_leads_webhook() -> str:
    """Get leads webhook URL from settings."""
    return settings.discord_leads_webhook


def get_quotes_webhook() -> str:
    """Get quotes webhook URL from settings."""
    return settings.discord_quotes_webhook


async def send_discord_message(webhook_url: str, content: str, embed: Optional[dict] = None) -> bool:
    """Send a message to Discord via webhook."""
    if not webhook_url:
        print("Discord webhook URL not configured")
        return False
    
    payload = {}
    
    if content:
        payload["content"] = content
    
    if embed:
        payload["embeds"] = [embed]
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(webhook_url, json=payload)
            return response.status_code in [200, 204]
    except Exception as e:
        print(f"Failed to send Discord message: {e}")
        return False


async def notify_new_lead(
    name: str,
    email: str,
    phone: Optional[str],
    company: Optional[str],
    message: Optional[str],
    contact_method: str = "email"
) -> bool:
    """Send notification to Discord when a new lead is created."""
    
    method_emoji = "📱" if contact_method == "whatsapp" else "📧"
    method_label = "WhatsApp" if contact_method == "whatsapp" else "Email"
    contact_info = phone if contact_method == "whatsapp" else email
    
    embed = {
        "title": "🆕 New Lead Received!",
        "color": 5763719,  # Green color
        "fields": [
            {"name": "👤 Name", "value": name, "inline": True},
            {"name": "🏢 Company", "value": company or "Not provided", "inline": True},
            {"name": f"{method_emoji} Preferred Contact", "value": method_label, "inline": True},
            {"name": "📧 Email", "value": email, "inline": True},
            {"name": "📱 Phone", "value": phone or "Not provided", "inline": True},
            {"name": "📝 Message", "value": message[:500] if message else "No message", "inline": False},
        ],
        "footer": {"text": "ByteWorks CRM"},
        "timestamp": None
    }
    
    # Add ready-to-send message
    if contact_method == "whatsapp" and phone:
        follow_up = f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 **READY-TO-SEND MESSAGE:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
Hi {name.split()[0]}! 👋

Thanks for reaching out to ByteWorks Agency!

I'm reviewing your request and will get back to you shortly with more details.

Is there a specific time that works best for a call?

Best regards,
Marc - ByteWorks Agency
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 WhatsApp: {phone}
"""
    else:
        follow_up = f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 **READY-TO-SEND MESSAGE:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
Hi {name.split()[0]}! 👋

Thanks for reaching out to ByteWorks Agency!

I'm reviewing your request and will get back to you shortly with more details.

If you have any questions in the meantime, feel free to reply to this email.

Best regards,
Marc - ByteWorks Agency
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: {email}
"""
    
    return await send_discord_message(get_leads_webhook(), follow_up, embed)


async def notify_new_quote(
    quote_number: str,
    client_name: str,
    client_email: str,
    client_phone: Optional[str],
    client_company: Optional[str],
    total: float,
    currency: str,
    valid_until: str,
    dashboard_url: str = ""
) -> bool:
    """Send notification to Discord when a new quote is created."""
    
    currency_symbol = "$" if currency == "USD" else "TT$"
    
    embed = {
        "title": "📋 New Quote Created!",
        "color": 3447003,  # Blue color
        "fields": [
            {"name": "📋 Quote #", "value": quote_number, "inline": True},
            {"name": "💰 Total", "value": f"{currency_symbol}{total:,.2f} {currency}", "inline": True},
            {"name": "📅 Valid Until", "value": valid_until, "inline": True},
            {"name": "👤 Client", "value": client_name, "inline": True},
            {"name": "🏢 Company", "value": client_company or "N/A", "inline": True},
            {"name": "📧 Email", "value": client_email, "inline": True},
        ],
        "footer": {"text": "ByteWorks CRM"},
    }
    
    first_name = client_name.split()[0] if client_name else "there"
    
    follow_up = f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 **MESSAGE FOR CLIENT (copy & send):**
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
Hi {first_name}! 👋

As discussed, I'm sending you the quote for your project.

📋 Quote: {quote_number}
💰 Total: {currency_symbol}{total:,.2f} {currency}
📅 Valid until: {valid_until}

Please review it and let me know if you have any questions or need adjustments.

Looking forward to working with you!

Best regards,
Marc - ByteWorks Agency
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: {client_email}
📱 Phone: {client_phone or 'N/A'}
"""
    
    return await send_discord_message(get_quotes_webhook(), follow_up, embed)


async def notify_quote_reminder(
    quote_number: str,
    client_name: str,
    client_email: str,
    client_phone: Optional[str],
    total: float,
    currency: str,
    days_remaining: int,
    valid_until: str
) -> bool:
    """Send reminder notification for quote follow-up (Day 7)."""
    
    currency_symbol = "$" if currency == "USD" else "TT$"
    first_name = client_name.split()[0] if client_name else "there"
    
    embed = {
        "title": "⏰ Quote Follow-up Reminder",
        "color": 15105570,  # Orange color
        "fields": [
            {"name": "📋 Quote #", "value": quote_number, "inline": True},
            {"name": "💰 Total", "value": f"{currency_symbol}{total:,.2f} {currency}", "inline": True},
            {"name": "⚠️ Days Remaining", "value": str(days_remaining), "inline": True},
            {"name": "👤 Client", "value": client_name, "inline": True},
            {"name": "📧 Email", "value": client_email, "inline": True},
            {"name": "📅 Expires", "value": valid_until, "inline": True},
        ],
        "footer": {"text": "ByteWorks CRM - 7 Day Reminder"},
    }
    
    follow_up = f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 **FOLLOW-UP MESSAGE (copy & send):**
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
Hi {first_name}! 👋

Just following up on the quote I sent you last week.

Have you had a chance to review it? I'm happy to answer any questions or make adjustments if needed.

The quote is valid until {valid_until}.

Let me know your thoughts!

Best regards,
Marc - ByteWorks Agency
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: {client_email}
📱 Phone: {client_phone or 'N/A'}
"""
    
    return await send_discord_message(get_quotes_webhook(), follow_up, embed)
