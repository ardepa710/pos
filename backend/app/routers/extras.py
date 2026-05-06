from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.schemas.extras import (
    GiftCardCreate,
    GiftCardRead,
    GiftCardRedeemRequest,
    ReturnCreate,
    ReturnRead,
)
from app.security.dependencies import CurrentUser, SupervisorUser
from app.services import gift_card_service, return_service

router = APIRouter(prefix="/api/v1", tags=["extras"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


# ---------------------------------------------------------------------------
# Gift card endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/gift-cards",
    response_model=GiftCardRead,
    status_code=201,
    summary="Emitir tarjeta de regalo",
)
async def issue_gift_card(
    data: GiftCardCreate,
    session: DbSession,
    _user: SupervisorUser,
) -> GiftCardRead:
    """Issue a new gift card. Requires supervisor or admin role."""
    async with session.begin():
        gift_card = await gift_card_service.issue_gift_card(session, data)
    return GiftCardRead.model_validate(gift_card)


@router.get(
    "/gift-cards/{code}",
    response_model=GiftCardRead,
    summary="Consultar tarjeta de regalo",
)
async def get_gift_card(
    code: str,
    session: DbSession,
    _user: CurrentUser,
) -> GiftCardRead:
    """Look up a gift card by its code."""
    gift_card = await gift_card_service.get_gift_card_by_code(session, code)
    return GiftCardRead.model_validate(gift_card)


@router.post(
    "/gift-cards/{code}/redeem",
    response_model=GiftCardRead,
    summary="Canjear tarjeta de regalo",
)
async def redeem_gift_card(
    code: str,
    body: GiftCardRedeemRequest,
    session: DbSession,
    _user: CurrentUser,
) -> GiftCardRead:
    """Redeem an amount from the gift card identified by *code*."""
    async with session.begin():
        gift_card = await gift_card_service.redeem_gift_card(
            session, code=code, amount=body.amount
        )
    return GiftCardRead.model_validate(gift_card)


@router.post(
    "/gift-cards/{code}/void",
    response_model=GiftCardRead,
    summary="Anular tarjeta de regalo",
)
async def void_gift_card(
    code: str,
    session: DbSession,
    _user: SupervisorUser,
) -> GiftCardRead:
    """Void a gift card. Requires supervisor or admin role."""
    async with session.begin():
        gift_card = await gift_card_service.get_gift_card_by_code(session, code)
        gift_card = await gift_card_service.void_gift_card(session, gift_card)
    return GiftCardRead.model_validate(gift_card)


@router.get(
    "/gift-cards/{code}/transactions",
    summary="Historial de transacciones de tarjeta de regalo",
)
async def list_gift_card_transactions(
    code: str,
    session: DbSession,
    _user: CurrentUser,
) -> list[dict]:
    """List all transactions for the gift card identified by *code*."""
    gift_card = await gift_card_service.get_gift_card_by_code(session, code)
    transactions = await gift_card_service.get_gift_card_transactions(
        session, gift_card.id
    )
    return [
        {
            "id": str(t.id),
            "transaction_type": t.transaction_type,
            "amount": str(t.amount),
            "balance_after": str(t.balance_after),
            "sale_id": str(t.sale_id) if t.sale_id else None,
            "note": t.note,
            "created_at": t.created_at.isoformat(),
        }
        for t in transactions
    ]


# ---------------------------------------------------------------------------
# Return endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/returns",
    response_model=ReturnRead,
    status_code=201,
    summary="Registrar devolución",
)
async def create_return(
    data: ReturnCreate,
    session: DbSession,
    user: SupervisorUser,
) -> ReturnRead:
    """Create a return. Requires supervisor or admin role."""
    return_obj = await return_service.create_return(session, data, user)
    return ReturnRead.model_validate(return_obj)


@router.get(
    "/returns",
    response_model=list[ReturnRead],
    summary="Listar devoluciones",
)
async def list_returns(
    session: DbSession,
    _user: CurrentUser,
    original_sale_id: uuid.UUID | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[ReturnRead]:
    """List returns, optionally filtered by original_sale_id."""
    returns = await return_service.list_returns(
        session,
        original_sale_id=original_sale_id,
        skip=skip,
        limit=limit,
    )
    return [ReturnRead.model_validate(r) for r in returns]


@router.get(
    "/returns/{return_id}",
    response_model=ReturnRead,
    summary="Consultar devolución",
)
async def get_return(
    return_id: uuid.UUID,
    session: DbSession,
    _user: CurrentUser,
) -> ReturnRead:
    """Get a single return by ID."""
    return_obj = await return_service.get_return(session, return_id)
    return ReturnRead.model_validate(return_obj)
