from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.schemas.business_settings import BusinessSettingsRead, BusinessSettingsUpdate
from app.security.dependencies import AdminUser, CurrentUser
from app.services import settings_service

log = structlog.get_logger()

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


@router.get(
    "/business",
    response_model=BusinessSettingsRead,
    summary="Obtener configuración del negocio",
)
async def get_business(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> BusinessSettingsRead:
    """Return the current business settings.

    Creates a default row on first access if none exists.
    """
    settings = await settings_service.get_business_settings(session)
    return BusinessSettingsRead.model_validate(settings)


@router.put(
    "/business",
    response_model=BusinessSettingsRead,
    summary="Actualizar configuración del negocio",
)
async def update_business(
    data: BusinessSettingsUpdate,
    current_user: AdminUser,
    session: AsyncSession = Depends(get_session),
) -> BusinessSettingsRead:
    """Update business settings. Requires *admin* role.

    Only the fields provided in the request body are updated (partial update).
    """
    settings = await settings_service.update_business_settings(session, data)
    log.info(
        "settings.business_updated",
        user_id=str(current_user.id),
    )
    return BusinessSettingsRead.model_validate(settings)


@router.post(
    "/wizard/complete",
    response_model=BusinessSettingsRead,
    status_code=status.HTTP_200_OK,
    summary="Marcar asistente de configuración como completado",
)
async def complete_wizard(
    current_user: AdminUser,
    session: AsyncSession = Depends(get_session),
) -> BusinessSettingsRead:
    """Mark the initial setup wizard as completed. Requires *admin* role."""
    settings = await settings_service.mark_wizard_completed(session)
    log.info("settings.wizard_completed", user_id=str(current_user.id))
    return BusinessSettingsRead.model_validate(settings)
