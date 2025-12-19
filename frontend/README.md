# ByteWorks Dashboard - Frontend

Next.js 16 frontend for the ByteWorks CRM Dashboard.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

- 🔐 **Authentication** - JWT-based login
- 👥 **Contacts** - Full CRUD for leads and clients
- 📊 **Dashboard** - Analytics overview
- 🌙 **Dark Mode** - System preference aware
- 📱 **Responsive** - Mobile-friendly design

## Environment Variables

See `.env.example` for required configuration.

## Build

```bash
npm run build
npm start
```

## Deploy

Configured for Vercel. Set Root Directory to `frontend/`.
