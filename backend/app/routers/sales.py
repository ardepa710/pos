from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.schemas.operations import (
    CashierSessionClose,
    CashierSessionOpen,
    CashierSessionRead,
    FxRateRead,
    SaleCreate,
    SaleRead,
    SaleVoidRequest,
)
from app.security.dependencies import CurrentUser, SupervisorUser
from app.services import cashier_session_service, fx_service, sale_service

log = structlog.get_logger()

router = APIRouter(prefix="/api/v1/sales", tags=["sales"])


# ---------------------------------------------------------------------------
# FX rate
# ---------------------------------------------------------------------------

@router.get("/fx-rate", response_model=FxRateRead)
async def get_fx_rate(
    _: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> FxRateRead:
    """Return today's USD/MXN exchange rate."""
    rate = await fx_service.get_current_rate(session)
    today = datetime.now(tz=timezone.utc).date()
    return FxRateRead(rate=rate, pair="USD_MXN", date=str(today))


# ---------------------------------------------------------------------------
# Cashier sessions
# ---------------------------------------------------------------------------

@router.post(
    "/sessions/open",
    response_model=CashierSessionRead,
    status_code=status.HTTP_201_CREATED,
)
async def open_cashier_session(
    body: CashierSessionOpen,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> CashierSessionRead:
    """Open a new cashier session for the authenticated user."""
    async with session.begin():
        cashier_session = await cashier_session_service.open_session(
            session, current_user, body.starting_cash_mxn
        )
    return CashierSessionRead.model_validate(cashier_session)


@router.post("/sessions/close", response_model=CashierSessionRead)
async def close_cashier_session(
    body: CashierSessionClose,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> CashierSessionRead:
    """Close the authenticated user's currently open cashier session."""
    cashier_session = await cashier_session_service.get_open_session(
        session, current_user.id
    )
    if cashier_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró una sesión abierta para este cajero",
        )
    async with session.begin():
        closed = await cashier_session_service.close_session(
            session, cashier_session, body.physical_cash_mxn
        )
    return CashierSessionRead.model_validate(closed)


@router.get("/sessions/current", response_model=CashierSessionRead | None)
async def get_current_session(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> CashierSessionRead | None:
    """Return the authenticated user's currently open cashier session, or null."""
    cashier_session = await cashier_session_service.get_open_session(
        session, current_user.id
    )
    if cashier_session is None:
        return None
    return CashierSessionRead.model_validate(cashier_session)


@router.get("/sessions/{session_id}", response_model=CashierSessionRead)
async def get_session_by_id(
    session_id: uuid.UUID,
    _: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> CashierSessionRead:
    """Return a cashier session by its ID."""
    cashier_session = await cashier_session_service.get_session_by_id(
        session, session_id
    )
    if cashier_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sesión no encontrada: {session_id}",
        )
    return CashierSessionRead.model_validate(cashier_session)


# ---------------------------------------------------------------------------
# Sales
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=SaleRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_sale(
    body: SaleCreate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> SaleRead:
    """Create a new sale.

    The authenticated user must have an open cashier session. The current
    USD/MXN rate is fetched automatically from the DB or Banxico API.
    """
    # Validate open session
    cashier_session_id = body.cashier_session_id
    if cashier_session_id is not None:
        cashier_session = await cashier_session_service.get_session_by_id(
            session, cashier_session_id
        )
        if cashier_session is None or cashier_session.cashier_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sesión de caja no encontrada",
            )
        if cashier_session.status != "open":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La sesión de caja no está abierta",
            )
    else:
        cashier_session = await cashier_session_service.get_open_session(
            session, current_user.id
        )
        if cashier_session is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El cajero no tiene una sesión abierta. Abra una sesión antes de registrar ventas.",
            )

    fx_rate = await fx_service.get_current_rate(session)

    sale = await sale_service.create_sale(
        session=session,
        data=body,
        cashier_user=current_user,
        cashier_session=cashier_session,
        fx_rate=fx_rate,
    )
    return SaleRead.model_validate(sale)


@router.get("/", response_model=list[SaleRead])
async def list_sales(
    _: CurrentUser,
    session: AsyncSession = Depends(get_session),
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    customer_id: Annotated[uuid.UUID | None, Query()] = None,
    cashier_session_id: Annotated[uuid.UUID | None, Query()] = None,
) -> list[SaleRead]:
    """Return a paginated list of sales with optional filters."""
    sales = await sale_service.list_sales(
        session,
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        cashier_session_id=cashier_session_id,
    )
    return [SaleRead.model_validate(s) for s in sales]


@router.get("/{sale_id}", response_model=SaleRead)
async def get_sale(
    sale_id: uuid.UUID,
    _: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> SaleRead:
    """Return a single sale by ID."""
    sale = await sale_service.get_sale(session, sale_id)
    return SaleRead.model_validate(sale)


@router.post("/{sale_id}/void", response_model=SaleRead)
async def void_sale(
    sale_id: uuid.UUID,
    body: SaleVoidRequest,
    current_user: SupervisorUser,
    session: AsyncSession = Depends(get_session),
) -> SaleRead:
    """Void a completed sale. Requires supervisor or admin role."""
    sale = await sale_service.get_sale(session, sale_id)
    voided = await sale_service.void_sale(session, sale, current_user, body.reason)
    # Reload for response (void_sale uses session.begin() internally)
    loaded = await sale_service.get_sale(session, voided.id)
    return SaleRead.model_validate(loaded)
