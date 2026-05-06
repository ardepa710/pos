from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.security.dependencies import AdminUser, CurrentUser
from app.services import user_service

log = structlog.get_logger()

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get(
    "",
    response_model=list[UserRead],
    summary="Listar usuarios",
)
async def list_users(
    _admin: AdminUser,
    session: AsyncSession = Depends(get_session),
    skip: int = 0,
    limit: int = 50,
) -> list[UserRead]:
    """Return a paginated list of all non-deleted users. Admin only."""
    users = await user_service.list_users(session, skip=skip, limit=limit)
    return [UserRead.model_validate(u) for u in users]


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear usuario",
)
async def create_user(
    body: UserCreate,
    _admin: AdminUser,
    session: AsyncSession = Depends(get_session),
) -> UserRead:
    """Create a new user. Admin only."""
    user = await user_service.create_user(session, body)
    return UserRead.model_validate(user)


@router.get(
    "/{user_id}",
    response_model=UserRead,
    summary="Obtener usuario",
)
async def get_user(
    user_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> UserRead:
    """Return a user by ID.

    Any authenticated user may fetch their own profile.
    Admins may fetch any user.
    """
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permiso para ver este usuario",
        )

    user = await user_service.get_user_by_id(session, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    return UserRead.model_validate(user)


@router.put(
    "/{user_id}",
    response_model=UserRead,
    summary="Actualizar usuario",
)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> UserRead:
    """Update a user.

    Users may update their own profile (limited fields).
    Admins may update any user including role and is_active.
    """
    is_own_profile = current_user.id == user_id
    is_admin = current_user.role == "admin"

    if not is_own_profile and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permiso para modificar este usuario",
        )

    # Non-admins cannot elevate privileges or deactivate accounts
    if not is_admin:
        restricted_data = body.model_dump(exclude_unset=True)
        for field in ("role", "is_active"):
            if field in restricted_data:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"No puede modificar el campo '{field}'",
                )

    user = await user_service.get_user_by_id(session, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    updated = await user_service.update_user(session, user, body)
    return UserRead.model_validate(updated)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar usuario (soft delete)",
)
async def delete_user(
    user_id: uuid.UUID,
    current_user: AdminUser,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Soft-delete a user. Admin only. An admin cannot delete themselves."""
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puede eliminar su propia cuenta",
        )

    user = await user_service.get_user_by_id(session, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    await user_service.soft_delete_user(session, user)
