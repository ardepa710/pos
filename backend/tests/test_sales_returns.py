"""Sale stock + return tests — covers audit findings H1 (server-side refund
price), H2 (cumulative return cap) and H3 (oversell guard)."""
from __future__ import annotations

from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.models.sale import SaleItem
from app.schemas.extras import ReturnCreate, ReturnItemCreate
from app.schemas.operations import PaymentCreate, SaleCreate, SaleItemCreate
from app.services import return_service, sale_service
from tests.factories import make_product, make_user, open_session_for


async def _cash_sale(db, *, qty: str, price: str, stock: str = "100"):
    cashier = await make_user(db, role="cashier")
    cs = await open_session_for(db, cashier)
    product = await make_product(db, stock=stock, price=price)
    data = SaleCreate(
        items=[SaleItemCreate(product_id=product.id, quantity=Decimal(qty))],
        payments=[PaymentCreate(method="cash", amount=Decimal("100000"))],
        cashier_session_id=cs.id,
    )
    sale = await sale_service.create_sale(db, data, cashier, cs, Decimal("17"))
    return cashier, product, sale


async def test_sale_decrements_stock(db) -> None:
    _, product, _ = await _cash_sale(db, qty="3", price="50", stock="10")
    await db.refresh(product)
    assert product.stock_quantity == Decimal("7")


async def test_sale_oversell_raises(db) -> None:
    """H3: selling more than stock must be rejected."""
    cashier = await make_user(db, role="cashier")
    cs = await open_session_for(db, cashier)
    product = await make_product(db, stock="5", price="50")
    data = SaleCreate(
        items=[SaleItemCreate(product_id=product.id, quantity=Decimal("10"))],
        payments=[PaymentCreate(method="cash", amount=Decimal("100000"))],
        cashier_session_id=cs.id,
    )
    with pytest.raises(HTTPException) as exc:
        await sale_service.create_sale(db, data, cashier, cs, Decimal("17"))
    assert exc.value.status_code == 422


async def test_return_uses_server_side_price(db) -> None:
    """H1: refund total is computed from the original sale item's price."""
    cashier, _, sale = await _cash_sale(db, qty="2", price="50")
    sale_item = (
        await db.execute(select(SaleItem).where(SaleItem.sale_id == sale.id))
    ).scalar_one()

    ret = await return_service.create_return(
        db,
        ReturnCreate(
            original_sale_id=sale.id,
            reason="defectuoso",
            refund_method="cash",
            items=[
                ReturnItemCreate(
                    original_sale_item_id=sale_item.id, quantity_returned=Decimal("1")
                )
            ],
        ),
        cashier,
    )
    assert ret.total_returned_mxn == Decimal("50")  # 1 * server price 50


async def test_return_cumulative_cap(db) -> None:
    """H2: total returned across requests cannot exceed quantity sold."""
    cashier, _, sale = await _cash_sale(db, qty="2", price="50")
    sale_item = (
        await db.execute(select(SaleItem).where(SaleItem.sale_id == sale.id))
    ).scalar_one()

    def _return(qty: str) -> ReturnCreate:
        return ReturnCreate(
            original_sale_id=sale.id,
            reason="x",
            refund_method="cash",
            items=[
                ReturnItemCreate(
                    original_sale_item_id=sale_item.id, quantity_returned=Decimal(qty)
                )
            ],
        )

    # Return both units — OK.
    await return_service.create_return(db, _return("2"), cashier)
    # Any further return must be rejected.
    with pytest.raises(HTTPException) as exc:
        await return_service.create_return(db, _return("1"), cashier)
    assert exc.value.status_code == 400
