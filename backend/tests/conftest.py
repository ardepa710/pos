"""Shared test fixtures.

Tests run against a real PostgreSQL database (the models use Postgres-specific
types — UUID, JSONB, ::uuid server defaults — so SQLite is not an option).
Point them at a throwaway DB by running with DB_NAME=pos_test (see the run
command in the PR / docs). The schema is created from the SQLAlchemy metadata
once per session and dropped at the end.

Two isolation styles:
- `db`     — a session whose writes are rolled back after each test. Service
             code only flushes (never commits), so this keeps tests isolated.
- `maker`  — an async_sessionmaker for tests that need committed, cross-session
             visible data (API/auth tests, concurrency tests).
"""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app import models  # noqa: F401 — import to populate Base.metadata
from app.config import settings
from app.database import Base, get_session
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def _schema():
    """Create a clean schema once, synchronously (avoids asyncpg event-loop
    binding issues that arise from a session-scoped async engine)."""
    eng = create_engine(settings.database_sync_url)
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    eng.dispose()
    yield


@pytest_asyncio.fixture
async def engine():
    """Function-scoped async engine — each test gets connections bound to its
    own event loop."""
    eng = create_async_engine(settings.database_url, echo=False)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def maker(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture
async def db(maker):
    """A session that is rolled back after the test (service-layer tests)."""
    async with maker() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(maker):
    """HTTP client against the ASGI app, with get_session overridden.

    The override session rolls back its own writes (so API tests don't
    pollute), but reads committed seed data created via `maker`.
    """

    async def _override_get_session():
        async with maker() as session:
            try:
                yield session
            finally:
                await session.rollback()

    app.dependency_overrides[get_session] = _override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
