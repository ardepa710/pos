from __future__ import annotations

import asyncio
import uuid
from datetime import date
from functools import partial
from typing import Any

import structlog
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.security.dependencies import CurrentUser
from app.services import pdf_service, report_service, xlsx_service
from app.services.settings_service import get_business_settings

log = structlog.get_logger()

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

_PDF_MEDIA = "application/pdf"
_XLSX_MEDIA = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _pdf_response(data: bytes, filename: str) -> StreamingResponse:
    return StreamingResponse(
        iter([data]),
        media_type=_PDF_MEDIA,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _xlsx_response(data: bytes, filename: str) -> StreamingResponse:
    return StreamingResponse(
        iter([data]),
        media_type=_XLSX_MEDIA,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def _run_in_thread(fn, *args) -> Any:  # type: ignore[return]
    """Run a CPU-bound function in the default thread-pool executor."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(fn, *args))


# ---------------------------------------------------------------------------
# Daily summary
# ---------------------------------------------------------------------------


@router.get("/daily", summary="Resumen diario en JSON")
async def get_daily_json(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
    report_date: date = Query(default_factory=date.today, alias="date"),
) -> dict:
    """Return the daily sales summary as JSON."""
    summary = await report_service.get_daily_summary(session, report_date)
    return {
        "date": summary.date.isoformat(),
        "total_sales": summary.total_sales,
        "total_revenue_mxn": str(summary.total_revenue_mxn),
        "total_revenue_usd": str(summary.total_revenue_usd),
        "cash_total": str(summary.cash_total),
        "card_total": str(summary.card_total),
        "gift_card_total": str(summary.gift_card_total),
        "top_products": summary.top_products,
        "cashier_sessions": summary.cashier_sessions,
    }


@router.get("/daily/pdf", summary="Resumen diario en PDF")
async def get_daily_pdf(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
    report_date: date = Query(default_factory=date.today, alias="date"),
) -> StreamingResponse:
    """Download the daily sales summary as a PDF."""
    summary = await report_service.get_daily_summary(session, report_date)
    settings = await get_business_settings(session)
    pdf_bytes: bytes = await _run_in_thread(
        pdf_service.generate_daily_summary_pdf, summary, settings.business_name
    )
    filename = f"resumen-diario-{report_date.isoformat()}.pdf"
    return _pdf_response(pdf_bytes, filename)


# ---------------------------------------------------------------------------
# Sales by period
# ---------------------------------------------------------------------------


@router.get("/sales", summary="Ventas por período en JSON")
async def get_sales_json(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
    date_from: date = Query(...),
    date_to: date = Query(...),
    group_by: str = Query(default="day", pattern="^(day|week|month)$"),
) -> list[dict]:
    """Return period-grouped sales for chart rendering."""
    return await report_service.get_sales_by_period(session, date_from, date_to, group_by)


@router.get("/sales/pdf", summary="Ventas por período en PDF")
async def get_sales_pdf(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
    date_from: date = Query(...),
    date_to: date = Query(...),
    group_by: str = Query(default="day", pattern="^(day|week|month)$"),
) -> StreamingResponse:
    """Download the period sales report as a PDF."""
    rows = await report_service.get_sales_by_period(session, date_from, date_to, group_by)
    settings = await get_business_settings(session)
    pdf_bytes: bytes = await _run_in_thread(
        pdf_service.generate_sales_report_pdf,
        rows,
        date_from,
        date_to,
        settings.business_name,
    )
    filename = f"ventas-{date_from.isoformat()}-{date_to.isoformat()}.pdf"
    return _pdf_response(pdf_bytes, filename)


@router.get("/sales/xlsx", summary="Ventas por período en Excel")
async def get_sales_xlsx(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
    date_from: date = Query(...),
    date_to: date = Query(...),
    group_by: str = Query(default="day", pattern="^(day|week|month)$"),
) -> StreamingResponse:
    """Download the period sales report as an Excel file."""
    rows = await report_service.get_sales_by_period(session, date_from, date_to, group_by)
    xlsx_bytes: bytes = await _run_in_thread(
        xlsx_service.generate_sales_xlsx, rows, date_from, date_to
    )
    filename = f"ventas-{date_from.isoformat()}-{date_to.isoformat()}.xlsx"
    return _xlsx_response(xlsx_bytes, filename)


# ---------------------------------------------------------------------------
# Product report
# ---------------------------------------------------------------------------


@router.get("/products", summary="Reporte de productos en JSON")
async def get_products_json(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
    date_from: date = Query(...),
    date_to: date = Query(...),
    category_id: uuid.UUID | None = Query(default=None),
) -> list[dict]:
    """Return per-product sales aggregation."""
    rows = await report_service.get_product_report(session, date_from, date_to, category_id)
    return [
        {
            "product_id": str(r.product_id),
            "sku": r.sku,
            "name": r.name,
            "quantity_sold": str(r.quantity_sold),
            "revenue_mxn": str(r.revenue_mxn),
            "stock_current": str(r.stock_current),
        }
        for r in rows
    ]


@router.get("/products/xlsx", summary="Reporte de productos en Excel")
async def get_products_xlsx(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
    date_from: date = Query(...),
    date_to: date = Query(...),
    category_id: uuid.UUID | None = Query(default=None),
) -> StreamingResponse:
    """Download the product sales report as an Excel file."""
    rows = await report_service.get_product_report(session, date_from, date_to, category_id)
    xlsx_bytes: bytes = await _run_in_thread(
        xlsx_service.generate_product_report_xlsx, rows
    )
    filename = f"productos-{date_from.isoformat()}-{date_to.isoformat()}.xlsx"
    return _xlsx_response(xlsx_bytes, filename)


# ---------------------------------------------------------------------------
# Inventory report
# ---------------------------------------------------------------------------


@router.get("/inventory", summary="Reporte de inventario en JSON")
async def get_inventory_json(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    """Return current stock levels for all active products."""
    return await report_service.get_inventory_report(session)


@router.get("/inventory/pdf", summary="Reporte de inventario en PDF")
async def get_inventory_pdf(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    """Download the inventory report as a PDF."""
    rows = await report_service.get_inventory_report(session)
    settings = await get_business_settings(session)
    pdf_bytes: bytes = await _run_in_thread(
        pdf_service.generate_inventory_pdf, rows, settings.business_name
    )
    return _pdf_response(pdf_bytes, "inventario.pdf")


@router.get("/inventory/xlsx", summary="Reporte de inventario en Excel")
async def get_inventory_xlsx(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    """Download the inventory report as an Excel file."""
    rows = await report_service.get_inventory_report(session)
    xlsx_bytes: bytes = await _run_in_thread(xlsx_service.generate_inventory_xlsx, rows)
    return _xlsx_response(xlsx_bytes, "inventario.xlsx")


# ---------------------------------------------------------------------------
# Customer report
# ---------------------------------------------------------------------------


@router.get("/customers", summary="Reporte de clientes en JSON")
async def get_customers_json(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
    date_from: date = Query(...),
    date_to: date = Query(...),
) -> list[dict]:
    """Return top-50 customers ranked by revenue in the given period."""
    return await report_service.get_customer_report(session, date_from, date_to)
