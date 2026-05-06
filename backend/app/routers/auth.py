from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.schemas.user import TokenResponse, UserRead
from app.security import create_access_token
from app.security.dependencies import CurrentUser
from app.security.password import hash_password, verify_password
from app.services import user_service

log = structlog.get_logger()

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Request body schemas specific to this router
# ---------------------------------------------------------------------------


class ChangePasswordBody(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=10, max_length=72)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Iniciar sesión",
)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    """Authenticate with *username* + *password* (OAuth2 form).

    Returns a Bearer token and the user profile on success.
    Raises 401 on wrong credentials, 403 if the account is inactive.
    """
    user = await user_service.authenticate_user(session, form.username, form.password)

    if user is None:
        log.warning("auth.login_failed", username=form.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        log.warning("auth.login_inactive", user_id=str(user.id))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


@router.post(
    "/change-password",
    summary="Cambiar contraseña",
    status_code=status.HTTP_200_OK,
)
async def change_password(
    body: ChangePasswordBody,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> dict[str, bool]:
    """Change the authenticated user's password.

    Verifies the current password before accepting the new one.
    Clears the *must_change_password* flag on success.
    """
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta",
        )

    current_user.password_hash = hash_password(body.new_password)
    current_user.must_change_password = False
    session.add(current_user)
    await session.commit()

    log.info("auth.password_changed", user_id=str(current_user.id))
    return {"ok": True}


@router.get(
    "/me",
    response_model=UserRead,
    summary="Perfil del usuario actual",
)
async def me(current_user: CurrentUser) -> UserRead:
    """Return the profile of the currently authenticated user."""
    return UserRead.model_validate(current_user)
