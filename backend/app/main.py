from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    log.info("pos.backend.startup", env=settings.env, demo_mode=settings.demo_mode)
    yield
    log.info("pos.backend.shutdown")


app = FastAPI(
    title="POS API",
    version="2026.05.06.1",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    return {"status": "ok", "version": "2026.05.06.1", "env": settings.env}


@app.get("/api/v1/branding", tags=["system"])
async def get_branding() -> dict[str, str]:
    """Public endpoint for frontend branding. No auth required."""
    return {
        "business_name": settings.business_name,
        "business_type": settings.business_type,
    }
