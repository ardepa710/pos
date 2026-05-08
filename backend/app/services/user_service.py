from __future__ import annotations

import uuid
from datetime import datetime, timezone

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.security.password import hash_password, verify_password

log = structlog.get_logger()

# ---------------------------------------------------------------------------
# Read helpers
# ---------------------------------------------------------------------------


async def get_user_by_username(session: AsyncSession, username: str) -> User | None:
    """Return the active user with *username*, or None."""
    result = await session.execute(
        select(User).where(User.username == username, User.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()


async def get_user_by_id(session: AsyncSession, user_id: uuid.UUID) -> User | None:
    """Return the active user with *user_id*, or None."""
    result = await session.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()


async def list_users(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 50,
) -> list[User]:
    """Return a paginated list of non-deleted users."""
    result = await session.execute(
        select(User)
        .where(User.deleted_at.is_(None))
        .order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Write helpers
# ---------------------------------------------------------------------------


async def create_user(
    session: AsyncSession,
    data: UserCreate,
    actor_id: uuid.UUID | None = None,
) -> User:
    """Create and persist a new user.

    Sets *must_change_password=True* when this is the very first user
    (i.e. the table is empty), so they are prompted to set a personal password.
    """
    count_result = await session.execute(
        select(func.count()).select_from(User).where(User.deleted_at.is_(None))
    )
    total: int = count_result.scalar_one()

    user = User(
        username=data.username,
        email=data.email,
        full_name=data.full_name,
        password_hash=hash_password(data.password),
        role=data.role,
        must_change_password=(total == 0),
    )
    session.add(user)
    await session.flush()
    await session.refresh(user)

    session.add(AuditLog(
        actor_id=actor_id,
        action="user.created",
        entity_type="user",
        entity_id=user.id,
        payload={"role": user.role, "username": user.username},
    ))

    log.info("user.created", user_id=str(user.id), role=user.role)
    return user


async def update_user(
    session: AsyncSession,
    user: User,
    data: UserUpdate,
    actor_id: uuid.UUID | None = None,
) -> User:
    """Apply *data* fields to *user* and persist."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    session.add(user)
    await session.flush()
    await session.refresh(user)

    session.add(AuditLog(
        actor_id=actor_id,
        action="user.updated",
        entity_type="user",
        entity_id=user.id,
        payload={"fields": list(update_data.keys())},
    ))

    log.info("user.updated", user_id=str(user.id))
    return user


async def soft_delete_user(
    session: AsyncSession,
    user: User,
    actor_id: uuid.UUID | None = None,
) -> None:
    """Mark *user* as deleted (soft delete) and deactivate the account."""
    user.deleted_at = datetime.now(timezone.utc)
    user.is_active = False

    session.add(user)
    await session.flush()

    session.add(AuditLog(
        actor_id=actor_id,
        action="user.deleted",
        entity_type="user",
        entity_id=user.id,
        payload=None,
    ))

    log.info("user.soft_deleted", user_id=str(user.id))


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------


async def authenticate_user(
    session: AsyncSession,
    username: str,
    password: str,
) -> User | None:
    """Verify *username* / *password* and return the User on success.

    Returns None if credentials are wrong.
    Updates *last_login_at* on successful authentication.
    """
    user = await get_user_by_username(session, username)
    if user is None:
        # Run verify anyway to avoid timing attacks that reveal username existence
        # Valid bcrypt hash of a random string — used only for constant-time dummy comparison.
        # Never matches any real password; prevents timing attacks that reveal username existence.
        verify_password(password, "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RVH1zM6yi")
        return None

    if not verify_password(password, user.password_hash):
        log.warning("auth.bad_password", username=username)
        return None

    # Update last login timestamp
    user.last_login_at = datetime.now(timezone.utc)
    session.add(user)
    await session.flush()
    await session.refresh(user)

    log.info("auth.login_success", user_id=str(user.id), role=user.role)
    return user


async def get_or_create_admin(session: AsyncSession, initial_password: str) -> User:
    """Ensure at least one admin account exists.

    If the users table is empty a default *admin* account is created using
    *initial_password* (from the ADMIN_INITIAL_PASSWORD env var).
    The account is flagged *must_change_password=True* so the operator is
    prompted to set a proper password on first login.
    """
    count_result = await session.execute(
        select(func.count()).select_from(User).where(User.deleted_at.is_(None))
    )
    total: int = count_result.scalar_one()

    if total > 0:
        # Users already exist — find and return the first admin
        result = await session.execute(
            select(User).where(User.role == "admin", User.deleted_at.is_(None)).limit(1)
        )
        existing = result.scalar_one_or_none()
        if existing is not None:
            return existing

    # No users at all — bootstrap the system
    admin = User(
        username="admin",
        email="admin@local.pos",
        full_name="Administrador",
        password_hash=hash_password(initial_password),
        role="admin",
        must_change_password=True,
    )
    session.add(admin)
    await session.flush()
    await session.refresh(admin)

    log.info("user.admin_bootstrapped", user_id=str(admin.id))
    return admin
