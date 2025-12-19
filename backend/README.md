# ByteWorks Dashboard - Backend

FastAPI backend for the ByteWorks CRM Dashboard.

## Quick Start

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

API docs at [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

## Features

- 🔐 **JWT Authentication** - Secure token-based auth
- 👥 **Contacts API** - CRUD operations
- 📄 **Quotes API** - Quote management
- 📊 **Analytics API** - Dashboard data
- 🔗 **Make.com Integration** - Webhook support

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| GET | `/api/contacts/` | List contacts |
| POST | `/api/contacts/` | Create contact |
| POST | `/api/contacts/public` | Public form submission |
| GET | `/api/analytics/dashboard` | Dashboard stats |

## Environment Variables

See `.env.example` for required configuration.

## Deploy

Configured for Vercel. Set Root Directory to `backend/`.
