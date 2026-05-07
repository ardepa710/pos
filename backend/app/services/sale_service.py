from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_DOWN

import structlog
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog
from app.models.cashier_session import CashierSession
from app.models.loyalty_account import LoyaltyAccount, LoyaltyTransaction
from app.models.product import Product
from app.models.sale import Payment, Sale, SaleItem
from app.models.stock_movement import StockMovement
from app.models.user import User
from app.schemas.operations import SaleCreate

log = structlog.get_logger()

LOYALTY_POINTS_PER_MXN = Decimal("10")  # 1 point per 10 MXN


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _load_sale_full(session: AsyncSession, sale_id: uuid.UUID) -> Sale | None:
    """Load a Sale and eagerly populate .items and .payments as Python attributes.

    The Sale model has no ORM relationships, so we query children explicitly
    and attach them as plain attributes consumed by the Pydantic schema.
    """
    sale_result = await session.execute(select(Sale).where(Sale.id == sale_id))
    sale = sale_result.scalar_one_or_none()
    if sale is None:
        return None

    items_result = await session.execute(
        select(SaleItem).where(SaleItem.sale_id == sale_id)
    )
    payments_result = await session.execute(
        select(Payment).where(Payment.sale_id == sale_id)
    )

    # Attach as dynamic attributes — Pydantic from_attributes=True will read them
    sale.items = list(items_result.scalars().all())  # type: ignore[attr-defined]
    sale.payments = list(payments_result.scalars().all())  # type: ignore[attr-defined]
    return sale


# ---------------------------------------------------------------------------
# Folio generation
# ---------------------------------------------------------------------------

async def _generate_folio(session: AsyncSession) -> str:
    """Generate next folio in the format VTA-YYYYMM-NNNNNN.

    Uses a COUNT(*) + 1 approach scoped to the current month so that folios
    restart each calendar month (matching common Mexican POS conventions).
    """
    today = datetime.now(tz=timezone.utc)
    month_prefix = today.strftime("%Y%m")

    # Count sales that already have folios starting with this month prefix
    result = await session.execute(
        select(func.count()).select_from(Sale).where(
            Sale.folio.like(f"VTA-{month_prefix}-%")
        )
    )
    count: int = result.scalar_one()
    next_num = count + 1
    return f"VTA-{month_prefix}-{next_num:06d}"


# ---------------------------------------------------------------------------
# Price resolution
# ---------------------------------------------------------------------------

def _resolve_unit_price(product: Product, price_tier: str) -> Decimal:
    """Return the unit price in MXN for the requested tier.

    Falls back to price_general if the specific tier price is NULL.
    """
    if price_tier == "a" and product.price_a is not None:
        return Decimal(str(product.price_a))
    if price_tier == "b" and product.price_b is not None:
        return Decimal(str(product.price_b))
    if price_tier == "c" and product.price_c is not None:
        return Decimal(str(product.price_c))
    return Decimal(str(product.price_general))


# ---------------------------------------------------------------------------
# create_sale
# ---------------------------------------------------------------------------

async def create_sale(
    session: AsyncSession,
    data: SaleCreate,
    cashier_user: User,
    cashier_session: CashierSession,
    fx_rate: Decimal,
) -> Sale:
    """Create a sale atomically.

    Steps:
    1. Validate each item's product (exists, active).
    2. Snapshot product fields, decrement stock if tracked, create StockMovement.
    3. Calculate line totals and overall totals.
    4. Convert total to USD using fx_rate.
    5. Persist Sale + SaleItem + Payment records.
    6. Earn loyalty points if customer_id provided.
    7. Update CashierSession running totals.
    8. Write AuditLog entry.
    9. Return Sale with items + payments eagerly loaded.
    """
    folio = await _generate_folio(session)
    today: date = datetime.now(tz=timezone.utc).date()

    # ── 1 & 2: validate and build SaleItem rows ──────────────────────────
    sale_items: list[SaleItem] = []
    subtotal_mxn = Decimal("0")
    discount_total_mxn = Decimal("0")

    for item_data in data.items:
        product_result = await session.execute(
            select(Product).where(
                Product.id == item_data.product_id,
                Product.deleted_at.is_(None),
            )
        )
        product = product_result.scalar_one_or_none()
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Producto no encontrado: {item_data.product_id}",
            )
        if not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Producto inactivo: {product.sku}",
            )

        unit_price = _resolve_unit_price(product, item_data.price_tier)
        discount = item_data.discount_mxn
        qty = item_data.quantity
        line_subtotal = (unit_price * qty) - discount

        if line_subtotal < Decimal("0"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Descuento mayor al subtotal para producto: {product.sku}",
            )

        subtotal_mxn += line_subtotal
        discount_total_mxn += discount

        # Inventory decrement
        if product.track_inventory:
            if product.stock_quantity < qty:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Stock insuficiente para {product.sku}: disponible={product.stock_quantity}",
                )
            product.stock_quantity = product.stock_quantity - qty  # type: ignore[assignment]

            movement = StockMovement(
                product_id=product.id,
                movement_type="sale_out",
                quantity=-qty,
                reference_type="sale",
                actor_id=cashier_user.id,
            )
            session.add(movement)

        sale_item = SaleItem(
            product_id=product.id,
            product_name_snapshot=product.name,
            product_sku_snapshot=product.sku,
            quantity=qty,
            unit_price_mxn=unit_price,
            unit_cost_snapshot=product.last_cost,
            price_tier_used=item_data.price_tier,
            discount_mxn=discount,
            subtotal_mxn=line_subtotal,
            was_consigned=product.is_consigned,
            consigned_supplier_id=product.consigned_supplier_id,
        )
        sale_items.append(sale_item)

    # ── 3: totals (tax = 0 for this iteration — plug in when tax logic lands) ──
    tax_total_mxn = Decimal("0")
    total_mxn = subtotal_mxn + tax_total_mxn  # discounts already in subtotal

    # ── 4: USD conversion ────────────────────────────────────────────────
    total_usd = (total_mxn / fx_rate).quantize(Decimal("0.0001"), rounding=ROUND_DOWN)

    # ── 5: persist Sale ──────────────────────────────────────────────────
    sale = Sale(
        folio=folio,
        customer_id=data.customer_id,
        cashier_id=cashier_user.id,
        cashier_session_id=cashier_session.id,
        status="completed",
        subtotal_mxn=subtotal_mxn,
        tax_mxn=tax_total_mxn,
        discount_mxn=discount_total_mxn,
        total_mxn=total_mxn,
        total_usd=total_usd,
        fx_rate_used=fx_rate,
        fx_rate_date=today,
        notes=data.notes,
    )
    session.add(sale)
    await session.flush()  # get sale.id

    # Attach sale_id to items and persist
    for sale_item in sale_items:
        sale_item.sale_id = sale.id  # type: ignore[assignment]
        session.add(sale_item)

    # Payments
    cash_total = Decimal("0")
    card_total = Decimal("0")
    gift_card_total = Decimal("0")

    for payment_data in data.payments:
        if payment_data.currency == "USD":
            amount_in_mxn = (payment_data.amount * fx_rate).quantize(
                Decimal("0.0001"), rounding=ROUND_DOWN
            )
            fx_used = fx_rate
        else:
            amount_in_mxn = payment_data.amount
            fx_used = Decimal("1")

        payment = Payment(
            sale_id=sale.id,
            method=payment_data.method,
            currency=payment_data.currency,
            amount=payment_data.amount,
            amount_in_mxn=amount_in_mxn,
            fx_rate_used=fx_used,
            gift_card_id=payment_data.gift_card_id,
            terminal_reference=payment_data.terminal_reference,
            card_last4=payment_data.card_last4,
        )
        session.add(payment)

        if payment_data.method == "cash":
            cash_total += amount_in_mxn
        elif payment_data.method in ("credit_card", "debit_card"):
            card_total += amount_in_mxn
        elif payment_data.method == "gift_card":
            gift_card_total += amount_in_mxn

    # ── 6: loyalty points ────────────────────────────────────────────────
    if data.customer_id is not None:
        loyalty_result = await session.execute(
            select(LoyaltyAccount).where(
                LoyaltyAccount.customer_id == data.customer_id
            )
        )
        loyalty_account = loyalty_result.scalar_one_or_none()

        if loyalty_account is None:
            loyalty_account = LoyaltyAccount(
                customer_id=data.customer_id,
                points_balance=0,
                lifetime_points=0,
            )
            session.add(loyalty_account)
            await session.flush()

        earned_points = int(
            (total_mxn / LOYALTY_POINTS_PER_MXN).to_integral_value(
                rounding=ROUND_DOWN
            )
        )

        if earned_points > 0:
            loyalty_account.points_balance += earned_points  # type: ignore[assignment]
            loyalty_account.lifetime_points += earned_points  # type: ignore[assignment]
            loyalty_account.last_activity_at = datetime.now(tz=timezone.utc)  # type: ignore[assignment]

            loyalty_tx = LoyaltyTransaction(
                account_id=loyalty_account.id,
                transaction_type="earn",
                points=earned_points,
                balance_after=loyalty_account.points_balance,
                reference_type="sale",
                reference_id=sale.id,
                notes=f"Venta {folio}",
            )
            session.add(loyalty_tx)

    # ── 7: update cashier session running totals ──────────────────────────
    cashier_session.total_sales_mxn = (  # type: ignore[assignment]
        (cashier_session.total_sales_mxn or Decimal("0")) + total_mxn
    )
    cashier_session.total_cash_payments = (  # type: ignore[assignment]
        (cashier_session.total_cash_payments or Decimal("0")) + cash_total
    )
    cashier_session.total_card_payments = (  # type: ignore[assignment]
        (cashier_session.total_card_payments or Decimal("0")) + card_total
    )
    cashier_session.total_gift_card_payments = (  # type: ignore[assignment]
        (cashier_session.total_gift_card_payments or Decimal("0")) + gift_card_total
    )

    # ── 8: audit log ─────────────────────────────────────────────────────
    audit = AuditLog(
        actor_id=cashier_user.id,
        action="sale.created",
        entity_type="sale",
        entity_id=sale.id,
        payload={
            "folio": folio,
            "total_mxn": str(total_mxn),
            "total_usd": str(total_usd),
            "fx_rate": str(fx_rate),
            "item_count": len(sale_items),
        },
    )
    session.add(audit)

    log.info(
        "sale.created",
        sale_id=str(sale.id),
        folio=folio,
        total_mxn=str(total_mxn),
        cashier_id=str(cashier_user.id),
    )

    # ── 9: reload and attach items + payments for the response ───────────────
    loaded_sale = await _load_sale_full(session, sale.id)
    assert loaded_sale is not None
    return loaded_sale


# ---------------------------------------------------------------------------
# get_sale
# ---------------------------------------------------------------------------

async def get_sale(session: AsyncSession, sale_id: uuid.UUID) -> Sale:
    """Fetch a sale with items and payments. Raises HTTP 404 if not found."""
    sale = await _load_sale_full(session, sale_id)
    if sale is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Venta no encontrada: {sale_id}",
        )
    return sale


# ---------------------------------------------------------------------------
# list_sales
# ---------------------------------------------------------------------------

async def list_sales(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    customer_id: uuid.UUID | None = None,
    cashier_session_id: uuid.UUID | None = None,
) -> list[Sale]:
    """Return a paginated list of sales with items and payments attached."""
    query = (
        select(Sale)
        .order_by(Sale.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if customer_id is not None:
        query = query.where(Sale.customer_id == customer_id)
    if cashier_session_id is not None:
        query = query.where(Sale.cashier_session_id == cashier_session_id)

    result = await session.execute(query)
    sales = list(result.scalars().all())

    # Attach items + payments for each sale
    for sale in sales:
        items_result = await session.execute(
            select(SaleItem).where(SaleItem.sale_id == sale.id)
        )
        payments_result = await session.execute(
            select(Payment).where(Payment.sale_id == sale.id)
        )
        sale.items = list(items_result.scalars().all())  # type: ignore[attr-defined]
        sale.payments = list(payments_result.scalars().all())  # type: ignore[attr-defined]

    return sales


# ---------------------------------------------------------------------------
# void_sale
# ---------------------------------------------------------------------------

async def void_sale(
    session: AsyncSession,
    sale: Sale,
    user: User,
    reason: str,
) -> Sale:
    """Void a completed sale.

    Restores inventory for each item and writes an audit log entry.
    Raises HTTP 409 if the sale is already voided.
    """
    if sale.status == "voided":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La venta ya está anulada",
        )

    # Load items for inventory restoration
    items_result = await session.execute(
        select(SaleItem).where(SaleItem.sale_id == sale.id)
    )
    loaded_items = list(items_result.scalars().all())
    full_sale = sale

    for item in loaded_items:
        product_result = await session.execute(
            select(Product).where(Product.id == item.product_id)
        )
        product = product_result.scalar_one_or_none()
        if product is not None and product.track_inventory:
            product.stock_quantity = product.stock_quantity + item.quantity  # type: ignore[assignment]

            movement = StockMovement(
                product_id=product.id,
                movement_type="return_in",
                quantity=item.quantity,
                reference_type="sale_void",
                reference_id=full_sale.id,
                actor_id=user.id,
                notes=f"Anulación: {reason}",
            )
            session.add(movement)

    full_sale.status = "voided"  # type: ignore[assignment]
    full_sale.cancelled_by = user.id  # type: ignore[assignment]
    full_sale.cancelled_at = datetime.now(tz=timezone.utc)  # type: ignore[assignment]
    full_sale.cancel_reason = reason  # type: ignore[assignment]

    audit = AuditLog(
        actor_id=user.id,
        action="sale.voided",
        entity_type="sale",
        entity_id=full_sale.id,
        payload={"reason": reason, "folio": full_sale.folio},
    )
    session.add(audit)

    log.info(
        "sale.voided",
        sale_id=str(full_sale.id),
        folio=full_sale.folio,
        voided_by=str(user.id),
        reason=reason,
    )

    return full_sale
