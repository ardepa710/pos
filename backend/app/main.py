from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.jobs.banxico_job import start_scheduler, stop_scheduler
from app.routers import catalog, reports, settings as settings_router
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.sales import router as sales_router
from app.routers.purchases import router as purchases_router
from app.routers.extras import router as extras_router
from app.routers.customers import router as customers_router
from app.routers.suppliers import router as suppliers_router

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    log.info("pos.backend.startup", env=settings.env, demo_mode=settings.demo_mode)
    start_scheduler()
    yield
    stop_scheduler()
    log.info("pos.backend.shutdown")


app = FastAPI(
    title="POS API",
    version="2026.05.06.1",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(catalog.router)
app.include_router(sales_router)
app.include_router(purchases_router)
app.include_router(extras_router)
app.include_router(reports.router)
app.include_router(settings_router.router)
app.include_router(customers_router)
app.include_router(suppliers_router)


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
