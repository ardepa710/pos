from __future__ import annotations

import uuid
from decimal import Decimal
from datetime import datetime, timezone

import structlog
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cashier_session import CashierSession
from app.models.user import User

log = structlog.get_logger()


async def open_session(
    session: AsyncSession,
    user: User,
    starting_cash_mxn: Decimal,
) -> CashierSession:
    """Open a new cashier session for the given user.

    Raises HTTP 409 if the user already has an open session.
    """
    result = await session.execute(
        select(CashierSession).where(
            CashierSession.cashier_id == user.id,
            CashierSession.status == "open",
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El cajero ya tiene una sesión abierta",
        )

    cashier_session = CashierSession(
        cashier_id=user.id,
        status="open",
        starting_cash_mxn=starting_cash_mxn,
        total_sales_mxn=Decimal("0"),
        total_cash_payments=Decimal("0"),
        total_card_payments=Decimal("0"),
        total_gift_card_payments=Decimal("0"),
        opened_at=datetime.now(tz=timezone.utc),
    )
    session.add(cashier_session)
    await session.flush()
    await session.refresh(cashier_session)

    log.info(
        "cashier_session.opened",
        session_id=str(cashier_session.id),
        cashier_id=str(user.id),
        starting_cash=str(starting_cash_mxn),
    )
    return cashier_session


async def close_session(
    session: AsyncSession,
    cashier_session: CashierSession,
    physical_cash_mxn: Decimal,
) -> CashierSession:
    """Close an open cashier session.

    Calculates expected cash (starting + all cash payments collected),
    sets difference, and marks the session as closed.

    Raises HTTP 409 if the session is already closed.
    """
    if cashier_session.status != "open":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La sesión ya está cerrada",
        )

    cash_collected = cashier_session.total_cash_payments or Decimal("0")
    starting = cashier_session.starting_cash_mxn or Decimal("0")
    expected_cash = starting + cash_collected

    cashier_session.physical_cash_mxn = physical_cash_mxn  # type: ignore[assignment]
    cashier_session.expected_cash_mxn = expected_cash  # type: ignore[assignment]
    cashier_session.difference_mxn = physical_cash_mxn - expected_cash  # type: ignore[assignment]
    cashier_session.status = "closed"  # type: ignore[assignment]
    cashier_session.closed_at = datetime.now(tz=timezone.utc)  # type: ignore[assignment]

    await session.flush()
    await session.refresh(cashier_session)

    log.info(
        "cashier_session.closed",
        session_id=str(cashier_session.id),
        expected=str(expected_cash),
        physical=str(physical_cash_mxn),
        difference=str(cashier_session.difference_mxn),
    )
    return cashier_session


async def get_open_session(
    session: AsyncSession,
    user_id: uuid.UUID,
) -> CashierSession | None:
    """Return the currently open session for a user, or None."""
    result = await session.execute(
        select(CashierSession).where(
            CashierSession.cashier_id == user_id,
            CashierSession.status == "open",
        )
    )
    return result.scalar_one_or_none()


async def get_session_by_id(
    session: AsyncSession,
    session_id: uuid.UUID,
) -> CashierSession | None:
    """Return a cashier session by its primary key, or None."""
    result = await session.execute(
        select(CashierSession).where(CashierSession.id == session_id)
    )
    return result.scalar_one_or_none()
