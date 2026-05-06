from __future__ import annotations

"""APScheduler job — fetches Banxico USD/MXN rate daily at 09:00 Mexico City time."""

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import AsyncSessionLocal
from app.services import fx_service

log = structlog.get_logger()

scheduler = AsyncIOScheduler(timezone="America/Mexico_City")


async def _fetch_and_store() -> None:
    """Create a fresh DB session and persist the current Banxico rate."""
    log.info("banxico_job.running")
    async with AsyncSessionLocal() as session:
        async with session.begin():
            try:
                rate = await fx_service.fetch_banxico_rate()
                await fx_service.store_rate(session, rate)
                log.info("banxico_job.completed", rate=str(rate))
            except Exception as exc:
                log.error("banxico_job.failed", error=str(exc))
                raise


def start_scheduler() -> None:
    """Register the daily 09:00 job and fire once immediately on startup.

    Call this from the FastAPI lifespan context manager.
    """
    scheduler.add_job(
        _fetch_and_store,
        CronTrigger(hour=9, minute=0),
        id="banxico_daily",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    # Fire immediately so we have a rate even before 09:00 on the first run
    scheduler.add_job(
        _fetch_and_store,
        id="banxico_startup",
        replace_existing=True,
    )
    scheduler.start()
    log.info("banxico_job.scheduler_started")


def stop_scheduler() -> None:
    """Shutdown the scheduler gracefully on application shutdown."""
    scheduler.shutdown(wait=False)
    log.info("banxico_job.scheduler_stopped")
