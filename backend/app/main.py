"""
ByteWorks Dashboard - FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse

from .core.config import settings
from .core.database import init_db
from .core.logger import get_app_logger
from .api.routes import api_router

# Initialize logger
logger = get_app_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup: Initialize database tables
    logger.info("Starting ByteWorks Dashboard...")
    await init_db()
    logger.info("Database initialized")
    yield
    # Shutdown
    logger.info("Shutting down...")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="CRM Dashboard API for managing contacts, quotes, and invoices",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# Rate Limiting Setup
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .core.rate_limiter import limiter
from .core.config import settings

# Configure the shared limiter with defaults
limiter.default_limits = [settings.rate_limit_default]
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS - Allow all origins for API access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False when using "*"
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

# Get frontend directory path
FRONTEND_DIR = Path(__file__).parent.parent.parent / "frontend"


# Serve static files if frontend exists
if FRONTEND_DIR.exists():
    static_dir = FRONTEND_DIR / "static"
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/", response_class=HTMLResponse)
async def serve_dashboard():
    """Serve the main dashboard HTML."""
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return HTMLResponse(
        content="""
        <html>
            <head><title>ByteWorks Dashboard</title></head>
            <body style="font-family: sans-serif; padding: 40px; text-align: center;">
                <h1>🚀 ByteWorks Dashboard API</h1>
                <p>API is running. Frontend not found.</p>
                <p><a href="/api/docs">View API Documentation</a></p>
            </body>
        </html>
        """,
        status_code=200
    )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "app": settings.app_name}
