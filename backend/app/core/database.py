"""
Database configuration and session management.
Uses SQLAlchemy async for PostgreSQL (Neon).
"""

import ssl
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from .config import settings


# Create SSL context for Neon
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Remove sslmode from URL if present (asyncpg uses connect_args instead)
database_url = settings.database_url.replace("?sslmode=require", "").replace("&sslmode=require", "")

# Create async engine with NullPool for serverless (Neon)
engine = create_async_engine(
    database_url,
    echo=settings.debug,
    poolclass=NullPool,  # Required for serverless databases like Neon
    connect_args={"ssl": ssl_context},
)

# Async session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_db() -> AsyncSession:
    """
    Dependency that provides a database session.
    Usage in routes: db: AsyncSession = Depends(get_db)
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
