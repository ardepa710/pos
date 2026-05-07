from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, time
from decimal import Decimal

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cashier_session import CashierSession
from app.models.customer import Customer
from app.models.product import Product
from app.models.sale import Payment, Sale, SaleItem

log = structlog.get_logger()


# ---------------------------------------------------------------------------
# Data classes — typed containers for report output, not DB models
# ---------------------------------------------------------------------------


@dataclass
class DailySummary:
    date: date
    total_sales: int
    total_revenue_mxn: Decimal
    total_revenue_usd: Decimal
    cash_total: Decimal
    card_total: Decimal
    gift_card_total: Decimal
    top_products: list[dict]  # [{"name": str, "qty": Decimal, "revenue": Decimal}]
    cashier_sessions: list[dict]


@dataclass
class ProductReport:
    product_id: uuid.UUID
    sku: str
    name: str
    quantity_sold: Decimal
    revenue_mxn: Decimal
    stock_current: Decimal


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _day_bounds(target: date) -> tuple[datetime, datetime]:
    """Return (start_of_day, end_of_day) as UTC-naive datetimes for filtering."""
    return (
        datetime.combine(target, time.min),
        datetime.combine(target, time.max),
    )


def _period_bounds(date_from: date, date_to: date) -> tuple[datetime, datetime]:
    return (
        datetime.combine(date_from, time.min),
        datetime.combine(date_to, time.max),
    )


# ---------------------------------------------------------------------------
# Report functions
# ---------------------------------------------------------------------------


async def get_daily_summary(session: AsyncSession, target_date: date) -> DailySummary:
    """Aggregate sales for *target_date*.

    Counts completed sales, sums revenue and payment-method totals,
    retrieves top-10 products by revenue, and lists cashier session summaries.
    """
    start, end = _day_bounds(target_date)

    # --- Aggregate sale totals -----------------------------------------------
    sale_agg = await session.execute(
        select(
            func.count(Sale.id).label("total_sales"),
            func.coalesce(func.sum(Sale.total_mxn), Decimal("0")).label("total_mxn"),
            func.coalesce(func.sum(Sale.total_usd), Decimal("0")).label("total_usd"),
        ).where(
            Sale.created_at >= start,
            Sale.created_at <= end,
            Sale.status == "completed",
        )
    )
    agg_row = sale_agg.one()
    total_sales: int = agg_row.total_sales or 0
    total_mxn: Decimal = agg_row.total_mxn or Decimal("0")
    total_usd: Decimal = agg_row.total_usd or Decimal("0")

    # --- Payment-method breakdown --------------------------------------------
    payment_agg = await session.execute(
        select(
            Payment.method,
            func.coalesce(func.sum(Payment.amount_in_mxn), Decimal("0")).label("total"),
        )
        .join(Sale, Sale.id == Payment.sale_id)
        .where(
            Sale.created_at >= start,
            Sale.created_at <= end,
            Sale.status == "completed",
        )
        .group_by(Payment.method)
    )
    payment_map: dict[str, Decimal] = {
        row.method: row.total for row in payment_agg.all()
    }
    cash_total = payment_map.get("cash", Decimal("0"))
    card_total = payment_map.get("card", Decimal("0"))
    gift_card_total = payment_map.get("gift_card", Decimal("0"))

    # --- Top-10 products by revenue ------------------------------------------
    top_rows = await session.execute(
        select(
            SaleItem.product_name_snapshot.label("name"),
            func.sum(SaleItem.quantity).label("qty"),
            func.sum(SaleItem.subtotal_mxn).label("revenue"),
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(
            Sale.created_at >= start,
            Sale.created_at <= end,
            Sale.status == "completed",
        )
        .group_by(SaleItem.product_name_snapshot)
        .order_by(func.sum(SaleItem.subtotal_mxn).desc())
        .limit(10)
    )
    top_products = [
        {"name": r.name, "qty": r.qty, "revenue": r.revenue}
        for r in top_rows.all()
    ]

    # --- Cashier sessions ----------------------------------------------------
    cs_rows = await session.execute(
        select(CashierSession).where(
            CashierSession.opened_at >= start,
            CashierSession.opened_at <= end,
        )
    )
    cashier_sessions = [
        {
            "id": str(cs.id),
            "cashier_id": str(cs.cashier_id),
            "status": cs.status,
            "starting_cash_mxn": cs.starting_cash_mxn,
            "total_sales_mxn": cs.total_sales_mxn or Decimal("0"),
            "total_cash_payments": cs.total_cash_payments or Decimal("0"),
            "total_card_payments": cs.total_card_payments or Decimal("0"),
            "total_gift_card_payments": cs.total_gift_card_payments or Decimal("0"),
            "opened_at": cs.opened_at,
            "closed_at": cs.closed_at,
        }
        for cs in cs_rows.scalars().all()
    ]

    log.info(
        "report.daily_summary",
        date=str(target_date),
        total_sales=total_sales,
        total_mxn=str(total_mxn),
    )

    return DailySummary(
        date=target_date,
        total_sales=total_sales,
        total_revenue_mxn=total_mxn,
        total_revenue_usd=total_usd,
        cash_total=cash_total,
        card_total=card_total,
        gift_card_total=gift_card_total,
        top_products=top_products,
        cashier_sessions=cashier_sessions,
    )


async def get_sales_by_period(
    session: AsyncSession,
    date_from: date,
    date_to: date,
    group_by: str = "day",
) -> list[dict]:
    """Return period-grouped sales data for chart rendering.

    Args:
        group_by: ``"day"`` | ``"week"`` | ``"month"``

    Returns:
        List of ``{"period": str, "count": int, "total_mxn": Decimal}``.
    """
    start, end = _period_bounds(date_from, date_to)

    trunc_map = {"day": "day", "week": "week", "month": "month"}
    trunc_unit = trunc_map.get(group_by, "day")

    period_expr = func.date_trunc(trunc_unit, Sale.created_at).label("period")

    rows = await session.execute(
        select(
            period_expr,
            func.count(Sale.id).label("count"),
            func.coalesce(func.sum(Sale.total_mxn), Decimal("0")).label("total_mxn"),
        )
        .where(
            Sale.created_at >= start,
            Sale.created_at <= end,
            Sale.status == "completed",
        )
        .group_by(period_expr)
        .order_by(period_expr)
    )

    return [
        {
            "period": row.period.date().isoformat() if row.period else None,
            "sale_count": row.count,
            "total_mxn": row.total_mxn,
        }
        for row in rows.all()
    ]


async def get_product_report(
    session: AsyncSession,
    date_from: date,
    date_to: date,
    category_id: uuid.UUID | None = None,
) -> list[ProductReport]:
    """Aggregate sales per product within the given period.

    Joins ``sale_items`` → ``products`` and optionally filters by category.
    """
    start, end = _period_bounds(date_from, date_to)

    stmt = (
        select(
            Product.id.label("product_id"),
            Product.sku,
            Product.name,
            func.coalesce(func.sum(SaleItem.quantity), Decimal("0")).label("qty_sold"),
            func.coalesce(func.sum(SaleItem.subtotal_mxn), Decimal("0")).label("revenue_mxn"),
            Product.stock_quantity,
        )
        .join(SaleItem, SaleItem.product_id == Product.id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(
            Sale.created_at >= start,
            Sale.created_at <= end,
            Sale.status == "completed",
            Product.deleted_at.is_(None),
        )
        .group_by(Product.id, Product.sku, Product.name, Product.stock_quantity)
        .order_by(func.sum(SaleItem.subtotal_mxn).desc())
    )

    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)

    rows = await session.execute(stmt)

    return [
        ProductReport(
            product_id=row.product_id,
            sku=row.sku,
            name=row.name,
            quantity_sold=row.qty_sold,
            revenue_mxn=row.revenue_mxn,
            stock_current=row.stock_quantity,
        )
        for row in rows.all()
    ]


async def get_inventory_report(session: AsyncSession) -> list[dict]:
    """Return all active products with stock levels and low-stock flag."""
    rows = await session.execute(
        select(
            Product.id,
            Product.sku,
            Product.name,
            Product.stock_quantity,
            Product.reorder_point,
            Product.unit_of_measure,
            Product.track_inventory,
            Product.is_active,
        )
        .where(Product.deleted_at.is_(None), Product.is_active.is_(True))
        .order_by(Product.name)
    )

    result = []
    for r in rows.all():
        is_low = (
            r.track_inventory
            and r.reorder_point is not None
            and r.stock_quantity <= r.reorder_point
        )
        result.append(
            {
                "id": str(r.id),
                "sku": r.sku,
                "name": r.name,
                "stock_quantity": r.stock_quantity,
                "reorder_point": r.reorder_point,
                "unit_of_measure": r.unit_of_measure,
                "track_inventory": r.track_inventory,
                "is_low_stock": is_low,
            }
        )

    return result


async def get_customer_report(
    session: AsyncSession,
    date_from: date,
    date_to: date,
) -> list[dict]:
    """Return top customers ranked by revenue in the given period."""
    start, end = _period_bounds(date_from, date_to)

    rows = await session.execute(
        select(
            Customer.id.label("customer_id"),
            Customer.full_name,
            Customer.code,
            func.count(Sale.id).label("total_orders"),
            func.coalesce(func.sum(Sale.total_mxn), Decimal("0")).label("revenue_mxn"),
        )
        .join(Sale, Sale.customer_id == Customer.id)
        .where(
            Sale.created_at >= start,
            Sale.created_at <= end,
            Sale.status == "completed",
            Customer.deleted_at.is_(None),
            Customer.is_default.is_(False),
        )
        .group_by(Customer.id, Customer.full_name, Customer.code)
        .order_by(func.sum(Sale.total_mxn).desc())
        .limit(50)
    )

    return [
        {
            "customer_id": str(r.customer_id),
            "full_name": r.full_name,
            "code": r.code,
            "total_orders": r.total_orders,
            "revenue_mxn": r.revenue_mxn,
        }
        for r in rows.all()
    ]
