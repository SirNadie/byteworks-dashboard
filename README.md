# ByteWorks Dashboard

CRM and Agency Management System for managing contacts, quotes, invoices, and analytics.

## 🚀 Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** (Neon) - Cloud database
- **SQLAlchemy** - Async ORM
- **JWT** - Authentication

### Frontend
- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Material Symbols** - Icons

## 📁 Project Structure

```
byteworks-dashboard/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── api/       # API routes
│   │   ├── core/      # Config, security, DB
│   │   ├── models/    # SQLAlchemy models
│   │   └── schemas/   # Pydantic schemas
│   └── requirements.txt
│
└── frontend/          # Next.js frontend
    ├── src/
    │   ├── app/       # Pages (App Router)
    │   ├── components/# React components
    │   └── lib/       # API client
    └── package.json
```

## 🛠️ Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Configure your environment
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # Configure API URL
npm run dev
```

## 🌐 Deploy

Both projects are configured for Vercel deployment:

1. **Backend**: Set Root Directory to `backend/`
2. **Frontend**: Set Root Directory to `frontend/`

### Environment Variables

#### Backend (Vercel)
- `DATABASE_URL` - Neon PostgreSQL connection string
- `SECRET_KEY` - JWT secret key
- `ALLOWED_ORIGINS` - CORS origins (comma-separated)
- `MAKE_WEBHOOK_URL` - (Optional) Make.com webhook

#### Frontend (Vercel)
- `NEXT_PUBLIC_API_URL` - Backend API URL

## 📝 License

Private - ByteWorks Agency
