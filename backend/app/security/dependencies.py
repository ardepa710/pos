from __future__ import annotations

import uuid
from typing import Annotated

import structlog
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.user import User
from app.security.jwt import decode_token

log = structlog.get_logger()

bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(bearer),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Resolve the authenticated user from the Bearer token.

    Raises 401 if the token is invalid or the user does not exist.
    Raises 403 if the user account is inactive.
    """
    payload = decode_token(credentials.credentials)  # raises 401 on failure

    raw_id: str | None = payload.get("sub")
    if raw_id is None:
        log.warning("jwt.missing_sub")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: falta campo sub",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = uuid.UUID(raw_id)
    except ValueError:
        log.warning("jwt.invalid_sub_format", sub=raw_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: sub no es un UUID",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await session.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()

    if user is None:
        log.warning("jwt.user_not_found", user_id=str(user_id))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        log.warning("jwt.user_inactive", user_id=str(user_id))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada",
        )

    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Require the authenticated user to have the *admin* role."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador",
        )
    return user


async def require_supervisor_or_admin(user: User = Depends(get_current_user)) -> User:
    """Require the authenticated user to have *admin* or *supervisor* role."""
    if user.role not in {"admin", "supervisor"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de supervisor o administrador",
        )
    return user


# ---------------------------------------------------------------------------
# Typed Annotated aliases — use in route signatures for clean dependency injection
# ---------------------------------------------------------------------------

CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_admin)]
SupervisorUser = Annotated[User, Depends(require_supervisor_or_admin)]
