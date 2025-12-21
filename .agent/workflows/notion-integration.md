---
description: Complete guide for Notion + Google Drive + Email integration setup
---

# 🔗 ByteWorks CRM - Notion Integration Guide

## Overview

This guide covers setting up the complete integration:
- **Notion** → Database for Leads, Clients, Quotes, Invoices, Payments
- **Google Drive** → Client folders for assets
- **Gmail** → Notifications (replaceable with WhatsApp later)

---

## 📊 Integration Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BYTEWORKS CRM FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

                              WEBSITE FORM
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1️⃣ NEW LEAD ARRIVES                                                        │
│                                                                             │
│     Form Submission ──▶ Backend API ──┬──▶ Save to PostgreSQL (CRM)        │
│                                       │                                     │
│                                       ├──▶ Create in Notion [Leads]        │
│                                       │                                     │
│                                       └──▶ Send Email Notification         │
│                                            "🆕 New Lead: John from ACME"   │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ (You contact the lead)
┌─────────────────────────────────────────────────────────────────────────────┐
│  2️⃣ CREATE QUOTE                                                            │
│                                                                             │
│     Dashboard ──▶ Create Quote ──┬──▶ Save to PostgreSQL                   │
│                                  │                                          │
│                                  ├──▶ Create in Notion [Quotes]            │
│                                  │    └── Linked to Lead                   │
│                                  │                                          │
│                                  └──▶ Generate PDF                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ (Quote accepted)
┌─────────────────────────────────────────────────────────────────────────────┐
│  3️⃣ CONVERT TO INVOICE (Quote Accepted)                                     │
│                                                                             │
│     Quote Accepted ──┬──▶ Create Invoice in PostgreSQL                     │
│                      │                                                      │
│                      ├──▶ Create CLIENT in Notion [Clients] ⭐              │
│                      │    └── This is the main hub                         │
│                      │                                                      │
│                      ├──▶ Update Quote status in Notion                    │
│                      │                                                      │
│                      ├──▶ Create Invoice in Notion [Invoices]              │
│                      │    └── Linked to Client                             │
│                      │                                                      │
│                      ├──▶ CREATE GOOGLE DRIVE FOLDER 📁                    │
│                      │    └── Clients/ClientName_Company/                  │
│                      │        ├── Assets/ (shared with client)             │
│                      │        ├── Quotes/                                  │
│                      │        └── Invoices/                                │
│                      │                                                      │
│                      ├──▶ Update Client with Drive Link                    │
│                      │                                                      │
│                      └──▶ Send Email to Client                             │
│                           "Your project folder is ready: [link]"           │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ (Client pays)
┌─────────────────────────────────────────────────────────────────────────────┐
│  4️⃣ PAYMENT RECEIVED                                                        │
│                                                                             │
│     Mark as Paid ──┬──▶ Update Invoice in PostgreSQL                       │
│                    │                                                        │
│                    ├──▶ Create Payment in Notion [Payments]                │
│                    │    └── Linked to Client & Invoice                     │
│                    │                                                        │
│                    ├──▶ Update Invoice status in Notion                    │
│                    │                                                        │
│                    ├──▶ Generate Receipt PDF                               │
│                    │                                                        │
│                    ├──▶ Upload to Google Drive                             │
│                    │                                                        │
│                    └──▶ Send Email Notification                            │
│                         "💰 Payment received from ACME: $2,500"            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Step 1: Create Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Fill in:
   - **Name:** `ByteWorks CRM`
   - **Associated workspace:** Select your workspace
   - **Type:** Internal
4. Click **"Submit"**
5. Copy the **"Internal Integration Secret"** (starts with `secret_...`)
6. Save it somewhere safe - you'll need it for the `.env` file

---

## 🗂️ Step 2: Create Notion Databases

### 2.1 Create a Page for the CRM

1. In Notion, create a new page called **"ByteWorks CRM"**
2. This will be the parent page for all databases

### 2.2 Create LEADS Database

1. Inside "ByteWorks CRM" page, type `/database` and select **"Database - Full page"**
2. Name it: **"Leads"**
3. Add these properties (columns):

| Property Name | Type | Options/Notes |
|---------------|------|---------------|
| Name | Title | (default) |
| Email | Email | |
| Phone | Phone | |
| Company | Text | |
| Message | Text | |
| Status | Select | `New`, `Contacted`, `Qualified`, `Converted`, `Lost` |
| Source | Select | `Website`, `Referral`, `LinkedIn`, `Other` |
| Contact Method | Select | `Email`, `WhatsApp` |
| Created | Created time | |
| CRM ID | Number | For syncing with PostgreSQL |

### 2.3 Create CLIENTS Database

1. Create another database: **"Clients"**
2. Add these properties:

| Property Name | Type | Options/Notes |
|---------------|------|---------------|
| Name | Title | Client/Company name |
| Contact Name | Text | Person's name |
| Email | Email | |
| Phone | Phone | |
| Company | Text | |
| Google Drive | URL | Link to their folder |
| Status | Select | `Active`, `Inactive`, `VIP` |
| Total Revenue | Rollup | (configure after creating Invoices) |
| Created | Created time | |
| CRM ID | Number | For syncing |
| Quotes | Relation | → Leads database (add later) |
| Invoices | Relation | → Invoices database (add later) |
| Payments | Relation | → Payments database (add later) |

### 2.4 Create QUOTES Database

1. Create database: **"Quotes"**
2. Add these properties:

| Property Name | Type | Options/Notes |
|---------------|------|---------------|
| Quote Number | Title | e.g., Q-2024-0001 |
| Client | Relation | → Clients database |
| Total | Number | Format as currency |
| Currency | Select | `USD`, `TTD` |
| Status | Select | `Draft`, `Sent`, `Accepted`, `Rejected`, `Expired` |
| Valid Until | Date | |
| PDF Link | URL | Link to quote PDF |
| Created | Created time | |
| CRM ID | Number | |

### 2.5 Create INVOICES Database

1. Create database: **"Invoices"**
2. Add these properties:

| Property Name | Type | Options/Notes |
|---------------|------|---------------|
| Invoice Number | Title | e.g., INV-2024-0001 |
| Client | Relation | → Clients database |
| Quote | Relation | → Quotes database |
| Total | Number | Format as currency |
| Currency | Select | `USD`, `TTD` |
| Status | Select | `Pending`, `Paid`, `Overdue`, `Cancelled` |
| Due Date | Date | |
| Paid Date | Date | |
| PDF Link | URL | |
| Created | Created time | |
| CRM ID | Number | |

### 2.6 Create PAYMENTS Database

1. Create database: **"Payments"**
2. Add these properties:

| Property Name | Type | Options/Notes |
|---------------|------|---------------|
| Payment | Title | Auto-generated or description |
| Client | Relation | → Clients database |
| Invoice | Relation | → Invoices database |
| Amount | Number | Format as currency |
| Currency | Select | `USD`, `TTD` |
| Method | Select | `Zelle`, `Wire`, `PayPal`, `Cash`, `Other` |
| Date | Date | |
| Receipt Link | URL | Link to receipt PDF |
| Notes | Text | |
| Created | Created time | |
| CRM ID | Number | |

---

## 🔗 Step 3: Connect the Integration to Databases

**IMPORTANT:** You must share each database with your integration!

For EACH database (Leads, Clients, Quotes, Invoices, Payments):

1. Open the database page
2. Click the **"..."** menu in the top right
3. Click **"+ Add connections"**
4. Search for **"ByteWorks CRM"** (your integration)
5. Click to add it

---

## 🔑 Step 4: Get Database IDs

For each database, you need its ID:

1. Open the database in Notion
2. Look at the URL: `https://www.notion.so/YOUR-WORKSPACE/DATABASE-ID?v=...`
3. The DATABASE-ID is the long string of characters before the `?`
4. Example: `https://www.notion.so/workspace/a1b2c3d4e5f6...` → ID is `a1b2c3d4e5f6...`

Save these IDs:
- `NOTION_LEADS_DB_ID=`
- `NOTION_CLIENTS_DB_ID=`
- `NOTION_QUOTES_DB_ID=`
- `NOTION_INVOICES_DB_ID=`
- `NOTION_PAYMENTS_DB_ID=`

---

## 📧 Step 5: Setup Gmail App Password

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click **"Security"** in the left menu
3. Under "How you sign in to Google", enable **"2-Step Verification"** if not already enabled
4. After enabling 2FA, go back to Security
5. Search for **"App passwords"** or go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
6. Select app: **"Mail"**
7. Select device: **"Windows Computer"** (or Other)
8. Click **"Generate"**
9. Copy the 16-character password (looks like: `xxxx xxxx xxxx xxxx`)
10. Save it - you'll need it for `.env`

---

## ⚙️ Step 6: Environment Variables

Add these to your `.env` file:

```env
# Notion Integration
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxx
NOTION_LEADS_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_CLIENTS_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_QUOTES_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_INVOICES_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_PAYMENTS_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Gmail SMTP
GMAIL_ADDRESS=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
NOTIFICATION_EMAIL=your-email@gmail.com

# Notification Channel (email now, whatsapp later)
NOTIFICATION_CHANNEL=email
```

---

## 🚀 Step 7: Implementation

After completing steps 1-6, tell the assistant you're ready and provide:
- Notion Integration Token
- Database IDs (all 5)
- Gmail address
- Gmail App Password

The assistant will then implement:
1. `notion.py` service
2. `email.py` service  
3. `notifications.py` service
4. Update all routes to use new services
5. Remove Discord integration

---

## 📱 Future: WhatsApp Integration

When you have budget for WhatsApp:

1. Sign up for Twilio or WhatsApp Business API
2. Get API credentials
3. Create `whatsapp.py` service
4. Change `.env`: `NOTIFICATION_CHANNEL=whatsapp`

No other code changes needed!

---

## ❓ Troubleshooting

### Notion API Errors
- **401 Unauthorized:** Check your integration token
- **404 Not Found:** Make sure the database is shared with the integration
- **400 Bad Request:** Check property names match exactly

### Gmail Errors
- **Authentication failed:** Make sure you're using App Password, not regular password
- **Less secure apps:** Not needed with App Passwords

### Google Drive Errors
- **Permission denied:** Check service account has access to the parent folder
