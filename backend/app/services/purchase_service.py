from __future__ import annotations

import uuid
from datetime import datetime, timezone, date
from decimal import Decimal
from typing import Optional

import structlog
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.product import Product
from app.models.purchase import ConsignmentSettlement, Purchase, PurchaseItem
from app.models.stock_movement import StockMovement
from app.models.supplier import Supplier
from app.models.user import User
from app.schemas.purchases import (
    ConsignmentInRequest,
    ConsignmentSettlementCreate,
    PurchaseCreate,
)

log = structlog.get_logger()

# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────


async def _attach_product_names(session: AsyncSession, items: list[PurchaseItem]) -> None:
    if not items:
        return
    ids = [item.product_id for item in items]
    result = await session.execute(select(Product.id, Product.name).where(Product.id.in_(ids)))
    name_map = {row.id: row.name for row in result}
    for item in items:
        item.__dict__["product_name"] = name_map.get(item.product_id, "")

_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


async def _next_folio_sequence(session: AsyncSession, prefix: str) -> str:
    """
    Return the next folio in the format <PREFIX>-YYYYMM-NNNNNN.

    Counts existing rows in `purchases` whose folio starts with the prefix
    for the current year-month, then increments by one.
    """
    now = datetime.now(tz=timezone.utc)
    ym = now.strftime("%Y%m")
    like_pattern = f"{prefix}-{ym}-%"
    result = await session.execute(
        select(func.count()).select_from(Purchase).where(Purchase.folio.like(like_pattern))
    )
    count: int = result.scalar_one()
    return f"{prefix}-{ym}-{(count + 1):06d}"


async def _next_settlement_folio(session: AsyncSession) -> str:
    """Return the next settlement folio in LIQ-YYYYMM-NNNNNN format."""
    now = datetime.now(tz=timezone.utc)
    ym = now.strftime("%Y%m")
    like_pattern = f"LIQ-{ym}-%"
    result = await session.execute(
        select(func.count())
        .select_from(ConsignmentSettlement)
        .where(ConsignmentSettlement.folio.like(like_pattern))
    )
    count: int = result.scalar_one()
    return f"LIQ-{ym}-{(count + 1):06d}"


async def _require_supplier(session: AsyncSession, supplier_id: uuid.UUID) -> Supplier:
    """Return the active supplier or raise HTTP 404."""
    result = await session.execute(
        select(Supplier).where(
            Supplier.id == supplier_id,
            Supplier.deleted_at.is_(None),
            Supplier.is_active.is_(True),
        )
    )
    supplier = result.scalar_one_or_none()
    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proveedor {supplier_id} no encontrado o inactivo",
        )
    return supplier


async def _require_product(session: AsyncSession, product_id: uuid.UUID) -> Product:
    """Return the active product or raise HTTP 404."""
    result = await session.execute(
        select(Product).where(
            Product.id == product_id,
            Product.deleted_at.is_(None),
            Product.is_active.is_(True),
        )
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Producto {product_id} no encontrado o inactivo",
        )
    return product


# ─────────────────────────────────────────────────────────────────────────────
# Purchases — items helper (shared by regular and consignment flows)
# ─────────────────────────────────────────────────────────────────────────────


async def _build_purchase_items(
    session: AsyncSession,
    purchase: Purchase,
    items_data: list,
    movement_type: str,
    update_stock: bool,
) -> tuple[Decimal, list[PurchaseItem]]:
    """
    Create PurchaseItem records and optionally update stock.

    Returns (total_amount, list[PurchaseItem]).
    The caller is responsible for adding objects to the session before commit.
    """
    total = Decimal("0")
    orm_items: list[PurchaseItem] = []

    for item_data in items_data:
        product = await _require_product(session, item_data.product_id)
        subtotal = item_data.quantity * item_data.unit_cost

        orm_item = PurchaseItem(
            purchase_id=purchase.id,
            product_id=product.id,
            quantity=item_data.quantity,
            unit_cost=item_data.unit_cost,
            subtotal=subtotal,
            tenant_id=_TENANT_ID,
        )
        orm_items.append(orm_item)
        total += subtotal

        # Update product cost snapshot
        product.last_cost = item_data.unit_cost
        product.last_cost_updated_at = datetime.now(tz=timezone.utc)

        if update_stock and product.track_inventory:
            product.stock_quantity = product.stock_quantity + item_data.quantity
            session.add(
                StockMovement(
                    product_id=product.id,
                    movement_type=movement_type,
                    quantity=item_data.quantity,
                    reference_type="purchase",
                    reference_id=purchase.id,
                    unit_cost=item_data.unit_cost,
                    actor_id=purchase.created_by,
                    tenant_id=_TENANT_ID,
                )
            )
        session.add(product)

    return total, orm_items


# ─────────────────────────────────────────────────────────────────────────────
# Regular purchases
# ─────────────────────────────────────────────────────────────────────────────


async def create_purchase(
    session: AsyncSession,
    data: PurchaseCreate,
    user: User,
) -> Purchase:
    """
    Record a regular stock purchase from a supplier.

    Atomic transaction:
      1. Validate supplier exists and is active.
      2. Generate folio (COM-YYYYMM-NNNNNN).
      3. Create Purchase record (status="received", purchase_type="normal").
      4. For each item: validate product, create PurchaseItem, increase
         stock_quantity when product.track_inventory is True, write StockMovement.
      5. Store subtotal/total on the Purchase.
      6. Write AuditLog.
    """
    await _require_supplier(session, data.supplier_id)
    folio = await _next_folio_sequence(session, "COM")
    now = datetime.now(tz=timezone.utc)

    purchase = Purchase(
        folio=folio,
        supplier_id=data.supplier_id,
        purchase_type="normal",
        status="received",
        subtotal=Decimal("0"),
        tax=Decimal("0"),
        total=Decimal("0"),
        currency=data.currency,
        exchange_rate=data.exchange_rate,
        notes=data.notes,
        created_by=user.id,
        received_at=now,
        tenant_id=_TENANT_ID,
    )
    session.add(purchase)
    # Flush to get purchase.id before building items
    await session.flush()

    total, orm_items = await _build_purchase_items(
        session,
        purchase,
        data.items,
        movement_type="purchase_in",
        update_stock=True,
    )

    for item in orm_items:
        session.add(item)

    purchase.subtotal = total
    purchase.total = total

    session.add(
        AuditLog(
            actor_id=user.id,
            action="purchase.created",
            entity_type="purchase",
            entity_id=purchase.id,
            payload={"folio": folio, "supplier_id": str(data.supplier_id), "total": str(total)},
            tenant_id=_TENANT_ID,
        )
    )

    try:
        await session.flush()
        await session.refresh(purchase)
    except Exception as exc:
        await session.rollback()
        log.error("purchase.create_failed", folio=folio, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo registrar la compra",
        ) from exc

    # Reload items (not ORM-mapped as relationship — fetch separately)
    items_result = await session.execute(
        select(PurchaseItem).where(PurchaseItem.purchase_id == purchase.id)
    )
    purchase.__dict__["items"] = list(items_result.scalars().all())
    await _attach_product_names(session, purchase.__dict__["items"])

    log.info("purchase.created", purchase_id=str(purchase.id), folio=folio, total=str(total))
    return purchase


async def get_purchase(session: AsyncSession, purchase_id: uuid.UUID) -> Purchase:
    """Return a single purchase or raise HTTP 404."""
    result = await session.execute(
        select(Purchase).where(
            Purchase.id == purchase_id,
            Purchase.deleted_at.is_(None),
        )
    )
    purchase = result.scalar_one_or_none()
    if purchase is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Compra {purchase_id} no encontrada",
        )
    items_result = await session.execute(
        select(PurchaseItem).where(PurchaseItem.purchase_id == purchase.id)
    )
    purchase.__dict__["items"] = list(items_result.scalars().all())
    await _attach_product_names(session, purchase.__dict__["items"])
    return purchase


async def list_purchases(
    session: AsyncSession,
    supplier_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Purchase]:
    """Return paginated purchases, optionally filtered by supplier."""
    stmt = (
        select(Purchase)
        .where(
            Purchase.deleted_at.is_(None),
            Purchase.purchase_type == "normal",
        )
        .order_by(Purchase.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if supplier_id is not None:
        stmt = stmt.where(Purchase.supplier_id == supplier_id)

    result = await session.execute(stmt)
    purchases = list(result.scalars().all())

    for purchase in purchases:
        items_result = await session.execute(
            select(PurchaseItem).where(PurchaseItem.purchase_id == purchase.id)
        )
        purchase.__dict__["items"] = list(items_result.scalars().all())
        await _attach_product_names(session, purchase.__dict__["items"])

    return purchases


# ─────────────────────────────────────────────────────────────────────────────
# Consignment
# ─────────────────────────────────────────────────────────────────────────────


async def record_consignment_in(
    session: AsyncSession,
    data: ConsignmentInRequest,
    user: User,
) -> Purchase:
    """
    Record arrival of consignment goods from a supplier.

    Creates a Purchase(purchase_type="consignment") at status="received".
    Marks each product as is_consigned=True, sets consigned_supplier_id.
    Adds stock via StockMovement(purchase_in) — consignment stock uses the
    same stock_quantity field; the movement type distinguishes origin.
    """
    supplier = await _require_supplier(session, data.supplier_id)
    folio = await _next_folio_sequence(session, "CON")
    now = datetime.now(tz=timezone.utc)

    purchase = Purchase(
        folio=folio,
        supplier_id=data.supplier_id,
        purchase_type="consignment",
        status="received",
        subtotal=Decimal("0"),
        tax=Decimal("0"),
        total=Decimal("0"),
        currency="MXN",
        notes=data.notes,
        created_by=user.id,
        received_at=now,
        consignment_period_start=data.consignment_period_start,
        consignment_period_end=data.consignment_period_end,
        consignment_settled=False,
        tenant_id=_TENANT_ID,
    )
    session.add(purchase)
    await session.flush()

    total, orm_items = await _build_purchase_items(
        session,
        purchase,
        data.items,
        movement_type="purchase_in",
        update_stock=True,
    )

    # Mark products as consigned
    for item_data in data.items:
        result = await session.execute(
            select(Product).where(Product.id == item_data.product_id)
        )
        product = result.scalar_one_or_none()
        if product is not None:
            product.is_consigned = True
            product.consigned_supplier_id = supplier.id
            session.add(product)

    for item in orm_items:
        session.add(item)

    purchase.subtotal = total
    purchase.total = total

    session.add(
        AuditLog(
            actor_id=user.id,
            action="consignment.in",
            entity_type="purchase",
            entity_id=purchase.id,
            payload={
                "folio": folio,
                "supplier_id": str(data.supplier_id),
                "period_start": str(data.consignment_period_start),
                "period_end": str(data.consignment_period_end),
            },
            tenant_id=_TENANT_ID,
        )
    )

    try:
        await session.flush()
        await session.refresh(purchase)
    except Exception as exc:
        await session.rollback()
        log.error("consignment.in_failed", folio=folio, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo registrar la entrada en consignación",
        ) from exc

    items_result = await session.execute(
        select(PurchaseItem).where(PurchaseItem.purchase_id == purchase.id)
    )
    purchase.__dict__["items"] = list(items_result.scalars().all())
    await _attach_product_names(session, purchase.__dict__["items"])

    log.info("consignment.in_created", purchase_id=str(purchase.id), folio=folio)
    return purchase


async def settle_consignment(
    session: AsyncSession,
    data: ConsignmentSettlementCreate,
    user: User,
) -> ConsignmentSettlement:
    """
    Close out a consignment period for a supplier.

    Calculates commission_amount = gross_sales * commission_pct.
    Calculates payable_to_supplier = gross_sales - commission_amount.
    Marks the originating Purchase as consignment_settled=True.
    Creates StockMovement(consignment_return_out) for items returned to supplier.
    """
    await _require_supplier(session, data.supplier_id)

    # Verify the referenced purchase exists and belongs to this supplier
    p_result = await session.execute(
        select(Purchase).where(
            Purchase.id == data.purchase_id,
            Purchase.supplier_id == data.supplier_id,
            Purchase.purchase_type == "consignment",
            Purchase.deleted_at.is_(None),
        )
    )
    purchase = p_result.scalar_one_or_none()
    if purchase is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compra en consignación no encontrada para el proveedor indicado",
        )
    if purchase.consignment_settled:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta consignación ya fue liquidada",
        )

    commission_amount = (data.gross_sales * data.commission_pct).quantize(Decimal("0.0001"))
    payable_to_supplier = (data.gross_sales - commission_amount).quantize(Decimal("0.0001"))

    folio = await _next_settlement_folio(session)

    settlement = ConsignmentSettlement(
        folio=folio,
        supplier_id=data.supplier_id,
        period_start=data.period_start,
        period_end=data.period_end,
        gross_sales=data.gross_sales,
        commission_pct=data.commission_pct,
        commission_amount=commission_amount,
        payable_to_supplier=payable_to_supplier,
        status="draft",
        notes=data.notes,
        tenant_id=_TENANT_ID,
    )
    session.add(settlement)
    await session.flush()

    # Retrieve items to create return movements
    items_result = await session.execute(
        select(PurchaseItem).where(PurchaseItem.purchase_id == purchase.id)
    )
    purchase_items = list(items_result.scalars().all())

    # Estimate returned quantity = original qty - proportional sold
    # (business logic: sold qty is tracked in gross_sales amount, not units here;
    #  we create a return movement only if the purchase had items with track_inventory)
    for p_item in purchase_items:
        prod_result = await session.execute(
            select(Product).where(Product.id == p_item.product_id)
        )
        product = prod_result.scalar_one_or_none()
        if product is not None and product.track_inventory:
            # Return remaining consigned stock to supplier (remove from store inventory)
            session.add(
                StockMovement(
                    product_id=product.id,
                    movement_type="consignment_return_out",
                    quantity=p_item.quantity,
                    reference_type="consignment_settlement",
                    reference_id=settlement.id,
                    unit_cost=p_item.unit_cost,
                    notes=f"Liquidación consignación {folio}",
                    actor_id=user.id,
                    tenant_id=_TENANT_ID,
                )
            )
            product.stock_quantity = product.stock_quantity - p_item.quantity
            product.is_consigned = False
            product.consigned_supplier_id = None
            session.add(product)

    # Mark purchase as settled
    purchase.consignment_settled = True
    purchase.consignment_settlement_id = settlement.id

    session.add(
        AuditLog(
            actor_id=user.id,
            action="consignment.settled",
            entity_type="consignment_settlement",
            entity_id=settlement.id,
            payload={
                "folio": folio,
                "supplier_id": str(data.supplier_id),
                "gross_sales": str(data.gross_sales),
                "payable_to_supplier": str(payable_to_supplier),
            },
            tenant_id=_TENANT_ID,
        )
    )

    try:
        await session.flush()
        await session.refresh(settlement)
    except Exception as exc:
        await session.rollback()
        log.error("consignment.settle_failed", folio=folio, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo liquidar la consignación",
        ) from exc

    log.info(
        "consignment.settled",
        settlement_id=str(settlement.id),
        folio=folio,
        payable=str(payable_to_supplier),
    )
    return settlement


async def list_consignments(
    session: AsyncSession,
    supplier_id: Optional[uuid.UUID] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Purchase]:
    """Return paginated consignment purchases, optionally filtered."""
    stmt = (
        select(Purchase)
        .where(
            Purchase.deleted_at.is_(None),
            Purchase.purchase_type == "consignment",
        )
        .order_by(Purchase.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if supplier_id is not None:
        stmt = stmt.where(Purchase.supplier_id == supplier_id)
    if status_filter is not None:
        stmt = stmt.where(Purchase.status == status_filter)

    result = await session.execute(stmt)
    purchases = list(result.scalars().all())

    for purchase in purchases:
        items_result = await session.execute(
            select(PurchaseItem).where(PurchaseItem.purchase_id == purchase.id)
        )
        purchase.__dict__["items"] = list(items_result.scalars().all())
        await _attach_product_names(session, purchase.__dict__["items"])

    return purchases
