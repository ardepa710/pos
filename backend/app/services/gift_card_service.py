from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import structlog
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.gift_card import GiftCard, GiftCardTransaction
from app.schemas.extras import GiftCardCreate

log = structlog.get_logger()


# ---------------------------------------------------------------------------
# Code generation and verification
# ---------------------------------------------------------------------------


def generate_gift_card_code(secret_key: str, payload: str) -> str:  # noqa: ARG001
    """Generate a unique HMAC-signed gift card code.

    Algorithm:
    1. random_token = secrets.token_hex(16)  → 32 hex chars
    2. token_segment = random_token[:8]      → 8 hex chars used as the HMAC payload
    3. sig = HMAC-SHA256(secret_key, token_segment).hexdigest()[:16] → 16 hex chars
    4. code = f"GC-{token_segment.upper()}-{sig.upper()}"

    Signing the 8-char *token_segment* (not the full 32-char token) ensures that
    ``verify_gift_card_code`` can reconstruct exactly the same signed payload from
    the code alone — without storing any additional state.

    The *payload* parameter is accepted for API compatibility; it is not used.
    """
    random_token = secrets.token_hex(16)
    token_segment = random_token[:8]
    sig = hmac.new(
        secret_key.encode(),
        token_segment.encode(),
        hashlib.sha256,
    ).hexdigest()[:16]
    code = f"GC-{token_segment.upper()}-{sig.upper()}"
    return code


def verify_gift_card_code(secret_key: str, code: str) -> bool:
    """Verify the HMAC signature embedded in the code.

    Parses the code as GC-<TOKEN_SEGMENT>-<SIG_SEGMENT> and recomputes the
    expected signature from the lower-cased token segment.  Returns True when
    the timing-safe comparison succeeds.
    """
    try:
        parts = code.split("-")
        if len(parts) != 3 or parts[0] != "GC":
            return False
        token_segment = parts[1].lower()
        sig_segment = parts[2].lower()
        expected_sig = hmac.new(
            secret_key.encode(),
            token_segment.encode(),
            hashlib.sha256,
        ).hexdigest()[:16]
        return hmac.compare_digest(expected_sig, sig_segment)
    except Exception:  # noqa: BLE001
        return False


# ---------------------------------------------------------------------------
# Service functions
# ---------------------------------------------------------------------------


async def issue_gift_card(
    session: AsyncSession,
    data: GiftCardCreate,
    issued_by_sale_id: uuid.UUID | None = None,
) -> GiftCard:
    """Create a GiftCard and record the initial 'issue' transaction.

    Generates a unique HMAC-signed code server-side.  The code uniqueness
    check is enforced by the DB unique index on gift_cards.code.
    """
    code = generate_gift_card_code(settings.secret_key, "")

    gift_card = GiftCard(
        code=code,
        initial_balance=data.initial_balance,
        current_balance=data.initial_balance,
        currency=data.currency,
        status="active",
        issued_by_sale_id=issued_by_sale_id,
        expires_at=data.expires_at,
    )
    session.add(gift_card)
    await session.flush()  # populate gift_card.id

    txn = GiftCardTransaction(
        gift_card_id=gift_card.id,
        transaction_type="issue",
        amount=Decimal(str(data.initial_balance)),
        balance_after=Decimal(str(data.initial_balance)),
        sale_id=issued_by_sale_id,
        note="Gift card issued",
    )
    session.add(txn)
    await session.flush()

    log.info(
        "gift_card.issued",
        gift_card_id=str(gift_card.id),
        code=code,
        initial_balance=str(data.initial_balance),
    )
    return gift_card


async def get_gift_card_by_code(session: AsyncSession, code: str) -> GiftCard:
    """Return the GiftCard matching *code*, or raise HTTP 404."""
    result = await session.execute(
        select(GiftCard).where(GiftCard.code == code)
    )
    gift_card = result.scalar_one_or_none()
    if gift_card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarjeta de regalo no encontrada",
        )
    return gift_card


async def redeem_gift_card(
    session: AsyncSession,
    code: str,
    amount: Decimal,
    sale_id: uuid.UUID | None = None,
) -> GiftCard:
    """Validate and redeem *amount* from the gift card identified by *code*.

    Validations:
    - Card must exist (404 otherwise).
    - Card status must be 'active' (400 otherwise).
    - Card must not be expired (400 otherwise).
    - Card must have sufficient balance (400 otherwise).

    On success: deducts balance, records a 'redeem' transaction, and if the
    resulting balance reaches zero sets status to 'redeemed'.
    """
    gift_card = await get_gift_card_by_code(session, code)

    if gift_card.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La tarjeta no está activa (estado: {gift_card.status})",
        )

    if gift_card.expires_at and gift_card.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La tarjeta de regalo ha expirado",
        )

    current_balance = Decimal(str(gift_card.current_balance))
    if amount > current_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Saldo insuficiente. Saldo actual: {current_balance}, "
                f"monto solicitado: {amount}"
            ),
        )

    new_balance = current_balance - amount
    gift_card.current_balance = new_balance  # type: ignore[assignment]

    if new_balance == Decimal("0"):
        gift_card.status = "redeemed"

    txn = GiftCardTransaction(
        gift_card_id=gift_card.id,
        transaction_type="redeem",
        amount=-amount,  # negative = debit
        balance_after=new_balance,
        sale_id=sale_id,
        note=f"Redención de {amount} {gift_card.currency}",
    )
    session.add(txn)
    await session.flush()

    log.info(
        "gift_card.redeemed",
        gift_card_id=str(gift_card.id),
        amount=str(amount),
        new_balance=str(new_balance),
        sale_id=str(sale_id) if sale_id else None,
    )
    return gift_card


async def void_gift_card(
    session: AsyncSession,
    gift_card: GiftCard,
) -> GiftCard:
    """Void an active gift card.

    Sets status to 'voided' and records a 'void' transaction with the
    remaining balance as the (returned) amount.
    """
    if gift_card.status == "voided":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La tarjeta ya está anulada",
        )

    remaining = Decimal(str(gift_card.current_balance))
    gift_card.status = "voided"
    gift_card.current_balance = Decimal("0")  # type: ignore[assignment]

    txn = GiftCardTransaction(
        gift_card_id=gift_card.id,
        transaction_type="void",
        amount=-remaining,
        balance_after=Decimal("0"),
        note="Tarjeta anulada",
    )
    session.add(txn)
    await session.flush()

    log.info(
        "gift_card.voided",
        gift_card_id=str(gift_card.id),
        remaining_balance=str(remaining),
    )
    return gift_card


async def get_gift_card_transactions(
    session: AsyncSession,
    gift_card_id: uuid.UUID,
) -> list[GiftCardTransaction]:
    """Return all transactions for the given gift card, oldest first."""
    result = await session.execute(
        select(GiftCardTransaction)
        .where(GiftCardTransaction.gift_card_id == gift_card_id)
        .order_by(GiftCardTransaction.created_at.asc())
    )
    return list(result.scalars().all())
