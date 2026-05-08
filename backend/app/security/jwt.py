from __future__ import annotations

from datetime import datetime, timedelta, timezone

import structlog
from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.config import settings

log = structlog.get_logger()


def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:
    """Encode *data* as a signed JWT with an expiry claim.

    If *expires_delta* is not provided the default from settings is used.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT.

    Returns the decoded payload dict.
    Raises HTTPException 401 on any invalid or expired token.
    """
    try:
        payload: dict = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        return payload
    except JWTError as exc:
        log.warning("jwt.decode.failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
