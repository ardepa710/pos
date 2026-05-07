from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

import structlog
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.product import Product
from app.models.return_ import Return, ReturnItem
from app.models.sale import Sale, SaleItem
from app.models.stock_movement import StockMovement
from app.models.user import User
from app.schemas.extras import GiftCardCreate, ReturnCreate
from app.services import gift_card_service

log = structlog.get_logger()

# ---------------------------------------------------------------------------
# Folio generation
# ---------------------------------------------------------------------------


async def _next_return_folio(session: AsyncSession) -> str:
    """Generate the next sequential return folio in DEV-YYYYMM-NNNNNN format.

    Counts existing returns in the current calendar month and increments by one.
    The counter resets on the first return of each new month.
    """
    now = datetime.now(timezone.utc)
    ym_prefix = f"DEV-{now.strftime('%Y%m')}-"

    result = await session.execute(
        select(func.count(Return.id)).where(Return.folio.like(f"{ym_prefix}%"))
    )
    count: int = result.scalar_one()
    sequence = count + 1
    return f"{ym_prefix}{sequence:06d}"


# ---------------------------------------------------------------------------
# Service functions
# ---------------------------------------------------------------------------


async def create_return(
    session: AsyncSession,
    data: ReturnCreate,
    user: User,
) -> Return:
    """Create a Return atomically.

    Steps (all within a single DB transaction):
    1.  Validate the original sale exists and is not voided/cancelled.
    2.  For each return item:
        a.  Validate the sale_item belongs to that sale.
        b.  Validate quantity_returned <= originally sold quantity.
        c.  Calculate subtotal_mxn.
    3.  Sum total_returned_mxn.
    4.  Generate folio DEV-YYYYMM-NNNNNN.
    5.  If refund_method == 'gift_card': issue a gift card for the total amount.
    6.  Restore inventory for each returned item when product.track_inventory.
    7.  Persist Return + ReturnItems.
    8.  Write AuditLog entry.
    """
    # ------------------------------------------------------------------
    # 1. Validate original sale
    # ------------------------------------------------------------------
    sale_result = await session.execute(
        select(Sale).where(Sale.id == data.original_sale_id)
    )
    sale = sale_result.scalar_one_or_none()
    if sale is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venta original no encontrada",
        )
    if sale.status in {"voided", "cancelled"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede devolver una venta con estado '{sale.status}'",
        )

    # ------------------------------------------------------------------
    # 2. Validate each return item
    # ------------------------------------------------------------------
    return_item_rows: list[tuple[ReturnItem, uuid.UUID]] = []
    total_returned_mxn = Decimal("0")

    for item_data in data.items:
        # Fetch original sale item
        si_result = await session.execute(
            select(SaleItem).where(
                SaleItem.id == item_data.original_sale_item_id,
                SaleItem.sale_id == sale.id,
            )
        )
        sale_item = si_result.scalar_one_or_none()
        if sale_item is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"La partida de venta {item_data.original_sale_item_id} "
                    f"no pertenece a la venta {sale.id}"
                ),
            )

        qty_sold = Decimal(str(sale_item.quantity))
        qty_returned = item_data.quantity_returned

        if qty_returned <= Decimal("0"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La cantidad a devolver debe ser mayor a cero",
            )
        if qty_returned > qty_sold:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cantidad a devolver ({qty_returned}) supera "
                    f"la cantidad vendida ({qty_sold}) para la partida "
                    f"{item_data.original_sale_item_id}"
                ),
            )

        subtotal = qty_returned * item_data.unit_price_mxn
        total_returned_mxn += subtotal

        return_item_rows.append(
            (
                ReturnItem(
                    original_sale_item_id=item_data.original_sale_item_id,
                    quantity_returned=qty_returned,
                    unit_price_mxn=item_data.unit_price_mxn,
                    subtotal_mxn=subtotal,
                ),
                sale_item.product_id,
            )
        )

    # ------------------------------------------------------------------
    # 3. Generate folio
    # ------------------------------------------------------------------
    folio = await _next_return_folio(session)

    # ------------------------------------------------------------------
    # 4. Issue gift card when refund_method is 'gift_card'
    # ------------------------------------------------------------------
    generated_gift_card_id: uuid.UUID | None = None
    if data.refund_method == "gift_card":
        gc = await gift_card_service.issue_gift_card(
            session,
            GiftCardCreate(initial_balance=total_returned_mxn),
        )
        generated_gift_card_id = gc.id

    # ------------------------------------------------------------------
    # 5. Persist Return
    # ------------------------------------------------------------------
    return_obj = Return(
        original_sale_id=data.original_sale_id,
        folio=folio,
        reason=data.reason,
        total_returned_mxn=total_returned_mxn,
        refund_method=data.refund_method,
        generated_gift_card_id=generated_gift_card_id,
        processed_by_user_id=user.id,
    )
    session.add(return_obj)
    await session.flush()  # populate return_obj.id

    # ------------------------------------------------------------------
    # 6. Persist ReturnItems + restore inventory
    # ------------------------------------------------------------------
    for return_item, product_id in return_item_rows:
        return_item.return_id = return_obj.id
        session.add(return_item)

        # Restore inventory when product tracks stock
        prod_result = await session.execute(
            select(Product).where(Product.id == product_id)
        )
        product = prod_result.scalar_one_or_none()
        if product is not None and product.track_inventory:
            product.stock_quantity = (  # type: ignore[assignment]
                Decimal(str(product.stock_quantity))
                + return_item.quantity_returned
            )
            session.add(
                StockMovement(
                    product_id=product_id,
                    movement_type="return_in",
                    quantity=return_item.quantity_returned,
                    reference_type="return",
                    reference_id=return_obj.id,
                    notes=f"Devolución {folio}",
                    actor_id=user.id,
                )
            )

    # ------------------------------------------------------------------
    # 7. Audit log
    # ------------------------------------------------------------------
    session.add(
        AuditLog(
            actor_id=user.id,
            action="create_return",
            entity_type="return",
            entity_id=return_obj.id,
            payload={
                "folio": folio,
                "original_sale_id": str(data.original_sale_id),
                "total_returned_mxn": str(total_returned_mxn),
                "refund_method": data.refund_method,
                "generated_gift_card_id": (
                    str(generated_gift_card_id)
                    if generated_gift_card_id
                    else None
                ),
            },
        )
    )

    log.info(
        "return.created",
        return_id=str(return_obj.id),
        folio=folio,
        total=str(total_returned_mxn),
        refund_method=data.refund_method,
        user_id=str(user.id),
    )
    return return_obj


async def get_return(session: AsyncSession, return_id: uuid.UUID) -> Return:
    """Return the Return record with the given ID, or raise HTTP 404."""
    result = await session.execute(
        select(Return).where(Return.id == return_id)
    )
    return_obj = result.scalar_one_or_none()
    if return_obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Devolución no encontrada",
        )
    return return_obj


async def list_returns(
    session: AsyncSession,
    original_sale_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Return]:
    """List returns, optionally filtered by original sale, with pagination."""
    query = select(Return).order_by(Return.created_at.desc()).offset(skip).limit(limit)
    if original_sale_id is not None:
        query = query.where(Return.original_sale_id == original_sale_id)
    result = await session.execute(query)
    return list(result.scalars().all())
