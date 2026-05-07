from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.schemas.purchases import (
    ConsignmentInRequest,
    ConsignmentSettlementCreate,
    ConsignmentSettlementRead,
    PurchaseCreate,
    PurchaseRead,
)
from app.security.dependencies import CurrentUser, SupervisorUser
from app.services import purchase_service

router = APIRouter(prefix="/api/v1/purchases", tags=["purchases"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


# ─────────────────────────────────────────────────────────────────────────────
# Regular purchases
# ─────────────────────────────────────────────────────────────────────────────


@router.get("", response_model=list[PurchaseRead])
async def list_purchases(
    _current_user: CurrentUser,
    session: DbSession,
    supplier_id: Optional[uuid.UUID] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[PurchaseRead]:
    """List regular purchases with optional supplier filter and pagination."""
    return await purchase_service.list_purchases(
        session,
        supplier_id=supplier_id,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=PurchaseRead, status_code=201)
async def create_purchase(
    data: PurchaseCreate,
    current_user: SupervisorUser,
    session: DbSession,
) -> PurchaseRead:
    """Create a regular purchase (receive goods from supplier, update stock)."""
    return await purchase_service.create_purchase(session, data, current_user)


# ─────────────────────────────────────────────────────────────────────────────
# Consignment — declared before /{purchase_id} so static paths match first
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/consignments/", response_model=list[PurchaseRead])
async def list_consignments(
    _current_user: CurrentUser,
    session: DbSession,
    supplier_id: Optional[uuid.UUID] = Query(default=None),
    status: Optional[str] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[PurchaseRead]:
    """List consignment purchases with optional supplier and status filters."""
    return await purchase_service.list_consignments(
        session,
        supplier_id=supplier_id,
        status_filter=status,
        skip=skip,
        limit=limit,
    )


@router.post("/consignments/in", response_model=PurchaseRead, status_code=201)
async def record_consignment_in(
    data: ConsignmentInRequest,
    current_user: SupervisorUser,
    session: DbSession,
) -> PurchaseRead:
    """Record arrival of goods on consignment from a supplier."""
    return await purchase_service.record_consignment_in(session, data, current_user)


@router.post("/consignments/settle", response_model=ConsignmentSettlementRead, status_code=201)
async def settle_consignment(
    data: ConsignmentSettlementCreate,
    current_user: SupervisorUser,
    session: DbSession,
) -> ConsignmentSettlementRead:
    """Settle a consignment period: record sales, calculate commission, return unsold stock."""
    return await purchase_service.settle_consignment(session, data, current_user)


# ─────────────────────────────────────────────────────────────────────────────
# Path-parameter route — must come after all static sub-paths
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/{purchase_id}", response_model=PurchaseRead)
async def get_purchase(
    purchase_id: uuid.UUID,
    _current_user: CurrentUser,
    session: DbSession,
) -> PurchaseRead:
    """Get a single purchase by ID."""
    return await purchase_service.get_purchase(session, purchase_id)
