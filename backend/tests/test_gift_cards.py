"""Gift-card money-path tests — covers audit findings C1 (sale must debit the
card) and C2 (no double-redeem race)."""
from __future__ import annotations

import asyncio
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.schemas.extras import GiftCardCreate
from app.schemas.operations import PaymentCreate, SaleCreate, SaleItemCreate
from app.services import gift_card_service, sale_service
from tests.factories import make_product, make_user, open_session_for


async def test_sale_paid_with_gift_card_debits_balance(db) -> None:
    """C1: using a gift card to pay a sale must reduce its balance."""
    cashier = await make_user(db, role="cashier")
    cs = await open_session_for(db, cashier)
    product = await make_product(db, stock="10", price="50")
    gc = await gift_card_service.issue_gift_card(
        db, GiftCardCreate(initial_balance=Decimal("100"))
    )

    data = SaleCreate(
        items=[SaleItemCreate(product_id=product.id, quantity=Decimal("1"))],
        payments=[
            PaymentCreate(method="gift_card", amount=Decimal("50"), gift_card_id=gc.id)
        ],
        cashier_session_id=cs.id,
    )
    await sale_service.create_sale(db, data, cashier, cs, Decimal("17"))

    await db.refresh(gc)
    assert gc.current_balance == Decimal("50")  # 100 - 50


async def test_sale_with_gift_card_missing_id_fails(db) -> None:
    cashier = await make_user(db, role="cashier")
    cs = await open_session_for(db, cashier)
    product = await make_product(db, stock="10", price="50")

    data = SaleCreate(
        items=[SaleItemCreate(product_id=product.id, quantity=Decimal("1"))],
        payments=[PaymentCreate(method="gift_card", amount=Decimal("50"))],
        cashier_session_id=cs.id,
    )
    with pytest.raises(HTTPException) as exc:
        await sale_service.create_sale(db, data, cashier, cs, Decimal("17"))
    assert exc.value.status_code == 422


async def test_sale_with_insufficient_gift_card_balance_fails(db) -> None:
    cashier = await make_user(db, role="cashier")
    cs = await open_session_for(db, cashier)
    product = await make_product(db, stock="10", price="50")
    gc = await gift_card_service.issue_gift_card(
        db, GiftCardCreate(initial_balance=Decimal("30"))
    )

    data = SaleCreate(
        items=[SaleItemCreate(product_id=product.id, quantity=Decimal("1"))],
        payments=[
            PaymentCreate(method="gift_card", amount=Decimal("50"), gift_card_id=gc.id)
        ],
        cashier_session_id=cs.id,
    )
    with pytest.raises(HTTPException) as exc:
        await sale_service.create_sale(db, data, cashier, cs, Decimal("17"))
    assert exc.value.status_code == 400


async def test_redeem_debits_and_marks_redeemed_at_zero(db) -> None:
    gc = await gift_card_service.issue_gift_card(
        db, GiftCardCreate(initial_balance=Decimal("40"))
    )
    await gift_card_service.redeem_gift_card_by_id(db, gc.id, Decimal("40"))
    await db.refresh(gc)
    assert gc.current_balance == Decimal("0")
    assert gc.status == "redeemed"


async def test_redeem_over_balance_raises(db) -> None:
    gc = await gift_card_service.issue_gift_card(
        db, GiftCardCreate(initial_balance=Decimal("10"))
    )
    with pytest.raises(HTTPException) as exc:
        await gift_card_service.redeem_gift_card_by_id(db, gc.id, Decimal("11"))
    assert exc.value.status_code == 400


async def test_concurrent_redeem_no_double_spend(engine) -> None:
    """C2: two concurrent redemptions of a 100-balance card for 60 each must
    NOT both succeed (the row lock serializes them — exactly one wins)."""
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async with maker() as s:
        async with s.begin():
            gc = await gift_card_service.issue_gift_card(
                s, GiftCardCreate(initial_balance=Decimal("100"))
            )
        gc_id = gc.id

    async def worker() -> str:
        async with maker() as s:
            async with s.begin():
                await gift_card_service.redeem_gift_card_by_id(s, gc_id, Decimal("60"))
        return "ok"

    results = await asyncio.gather(worker(), worker(), return_exceptions=True)
    successes = [r for r in results if r == "ok"]
    failures = [r for r in results if isinstance(r, HTTPException)]
    assert len(successes) == 1, f"expected exactly 1 success, got {results}"
    assert len(failures) == 1

    async with maker() as s:
        card = await gift_card_service.get_gift_card_by_id(s, gc_id)
        assert card.current_balance == Decimal("40")  # only one 60 debit applied
