from __future__ import annotations

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business_settings import BusinessSettings
from app.schemas.business_settings import BusinessSettingsUpdate

log = structlog.get_logger()


async def get_business_settings(session: AsyncSession) -> BusinessSettings:
    """Return the current BusinessSettings row, creating it with defaults if absent."""
    result = await session.execute(select(BusinessSettings).limit(1))
    settings = result.scalar_one_or_none()

    if settings is None:
        log.info("settings.create_defaults")
        settings = BusinessSettings(
            business_name="Mi Negocio",
            base_currency="MXN",
            secondary_currency="USD",
            wizard_completed=False,
        )
        session.add(settings)
        await session.commit()
        await session.refresh(settings)

    return settings


async def update_business_settings(
    session: AsyncSession,
    data: BusinessSettingsUpdate,
) -> BusinessSettings:
    """Apply the non-null fields in *data* to the BusinessSettings row.

    Creates the row with defaults first if it does not yet exist.
    """
    settings = await get_business_settings(session)

    update_dict = data.model_dump(exclude_none=True)
    if not update_dict:
        return settings

    for field, value in update_dict.items():
        setattr(settings, field, value)

    session.add(settings)
    await session.commit()
    await session.refresh(settings)

    log.info("settings.updated", fields=list(update_dict.keys()))
    return settings


async def mark_wizard_completed(session: AsyncSession) -> BusinessSettings:
    """Set ``wizard_completed = True`` on the BusinessSettings row."""
    settings = await get_business_settings(session)
    settings.wizard_completed = True
    session.add(settings)
    await session.commit()
    await session.refresh(settings)
    log.info("settings.wizard_completed")
    return settings
