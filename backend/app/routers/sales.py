from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated

import httpx
import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings as app_settings
from app.database import get_session
from app.schemas.operations import (
    CashierSessionClose,
    CashierSessionOpen,
    CashierSessionRead,
    FxRateRead,
    SaleCreate,
    SaleRead,
    SaleVoidRequest,
)
from app.security.dependencies import CurrentUser, SupervisorUser
from app.services import cashier_session_service, fx_service, sale_service, settings_service
from app.services import receipt_service

log = structlog.get_logger()

router = APIRouter(prefix="/api/v1/sales", tags=["sales"])


# ---------------------------------------------------------------------------
# FX rate
# ---------------------------------------------------------------------------

@router.get("/fx-rate", response_model=FxRateRead)
async def get_fx_rate(
    _: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> FxRateRead:
    """Return today's USD/MXN exchange rate."""
    rate = await fx_service.get_current_rate(session)
    today = datetime.now(tz=timezone.utc).date()
    return FxRateRead(rate=rate, pair="USD_MXN", date=str(today))


# ---------------------------------------------------------------------------
# Cashier sessions
# ---------------------------------------------------------------------------

@router.post(
    "/sessions/open",
    response_model=CashierSessionRead,
    status_code=status.HTTP_201_CREATED,
)
async def open_cashier_session(
    body: CashierSessionOpen,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> CashierSessionRead:
    """Open a new cashier session for the authenticated user."""
    cashier_session = await cashier_session_service.open_session(
        session, current_user, body.starting_cash_mxn
    )
    return CashierSessionRead.model_validate(cashier_session)


@router.post("/sessions/close", response_model=CashierSessionRead)
async def close_cashier_session(
    body: CashierSessionClose,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> CashierSessionRead:
    """Close the authenticated user's currently open cashier session."""
    cashier_session = await cashier_session_service.get_open_session(
        session, current_user.id
    )
    if cashier_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró una sesión abierta para este cajero",
        )
    closed = await cashier_session_service.close_session(
        session, cashier_session, body.physical_cash_mxn
    )
    return CashierSessionRead.model_validate(closed)


@router.get("/sessions/current", response_model=CashierSessionRead | None)
async def get_current_session(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> CashierSessionRead | None:
    """Return the authenticated user's currently open cashier session, or null."""
    cashier_session = await cashier_session_service.get_open_session(
        session, current_user.id
    )
    if cashier_session is None:
        return None
    return CashierSessionRead.model_validate(cashier_session)


@router.get("/sessions/{session_id}", response_model=CashierSessionRead)
async def get_session_by_id(
    session_id: uuid.UUID,
    _: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> CashierSessionRead:
    """Return a cashier session by its ID."""
    cashier_session = await cashier_session_service.get_session_by_id(
        session, session_id
    )
    if cashier_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sesión no encontrada: {session_id}",
        )
    return CashierSessionRead.model_validate(cashier_session)


# ---------------------------------------------------------------------------
# Sales
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=SaleRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_sale(
    body: SaleCreate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> SaleRead:
    """Create a new sale.

    The authenticated user must have an open cashier session. The current
    USD/MXN rate is fetched automatically from the DB or Banxico API.
    """
    # Validate open session
    cashier_session_id = body.cashier_session_id
    if cashier_session_id is not None:
        cashier_session = await cashier_session_service.get_session_by_id(
            session, cashier_session_id
        )
        if cashier_session is None or cashier_session.cashier_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sesión de caja no encontrada",
            )
        if cashier_session.status != "open":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La sesión de caja no está abierta",
            )
    else:
        cashier_session = await cashier_session_service.get_open_session(
            session, current_user.id
        )
        if cashier_session is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El cajero no tiene una sesión abierta. Abra una sesión antes de registrar ventas.",
            )

    fx_rate = await fx_service.get_current_rate(session)

    sale = await sale_service.create_sale(
        session=session,
        data=body,
        cashier_user=current_user,
        cashier_session=cashier_session,
        fx_rate=fx_rate,
    )
    return SaleRead.model_validate(sale)


@router.get("", response_model=list[SaleRead])
async def list_sales(
    _: CurrentUser,
    session: AsyncSession = Depends(get_session),
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    customer_id: Annotated[uuid.UUID | None, Query()] = None,
    cashier_session_id: Annotated[uuid.UUID | None, Query()] = None,
) -> list[SaleRead]:
    """Return a paginated list of sales with optional filters."""
    sales = await sale_service.list_sales(
        session,
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        cashier_session_id=cashier_session_id,
    )
    return [SaleRead.model_validate(s) for s in sales]


@router.get("/{sale_id}", response_model=SaleRead)
async def get_sale(
    sale_id: uuid.UUID,
    _: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> SaleRead:
    """Return a single sale by ID."""
    sale = await sale_service.get_sale(session, sale_id)
    return SaleRead.model_validate(sale)


@router.post("/{sale_id}/void", response_model=SaleRead)
async def void_sale(
    sale_id: uuid.UUID,
    body: SaleVoidRequest,
    current_user: SupervisorUser,
    session: AsyncSession = Depends(get_session),
) -> SaleRead:
    """Void a completed sale. Requires supervisor or admin role."""
    sale = await sale_service.get_sale(session, sale_id)
    voided = await sale_service.void_sale(session, sale, current_user, body.reason)
    # Reload for response (void_sale uses session.begin() internally)
    loaded = await sale_service.get_sale(session, voided.id)
    return SaleRead.model_validate(loaded)


@router.get("/{sale_id}/receipt-preview", summary="Preview receipt as plain text")
async def receipt_preview(
    sale_id: uuid.UUID,
    _user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Return the receipt content as plain text for debugging.

    Useful for verifying layout without sending to a printer, and for
    confirming the text mode output that would be sent to PDF/virtual drivers.
    """
    sale_orm = await sale_service.get_sale(session, sale_id)
    sale_read = SaleRead.model_validate(sale_orm)
    biz_settings = await settings_service.get_business_settings(session)
    text = receipt_service.build_receipt_text(sale_read, biz_settings)
    return {"text": text, "lines": str(len(text.splitlines()))}


@router.post("/{sale_id}/print", summary="Print receipt via Print Bridge")
async def print_receipt(
    sale_id: uuid.UUID,
    _user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Generate ESC/POS bytes and plain text for the sale, send to Print Bridge.

    Both ``data_hex`` (raw ESC/POS) and ``data_text`` (plain text) are sent in
    every request.  The bridge uses ``mode="auto"`` to decide which one to use:
    * Real thermal printers   → ESC/POS binary (raw datatype)
    * PDF / virtual printers  → plain text (TEXT datatype, no empty files)
    """

    # 1. Check Print Bridge is enabled
    if not app_settings.print_bridge_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Print Bridge no habilitado",
        )

    # 2. Load sale (raises 404 if not found)
    sale_orm = await sale_service.get_sale(session, sale_id)
    sale_read = SaleRead.model_validate(sale_orm)

    # 3. Load business settings
    biz_settings = await settings_service.get_business_settings(session)

    # 4. Validate printer is configured
    if not biz_settings.ticket_printer_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay impresora configurada en Configuracion -> Ticket",
        )

    # 5. Build both receipt formats
    raw_bytes = receipt_service.build_receipt(sale_read, biz_settings)
    text_content = receipt_service.build_receipt_text(sale_read, biz_settings)

    # 6. Send to Print Bridge — bridge auto-detects mode from printer name
    # Pass logo_url only when ticket_show_logo is enabled and a URL is stored.
    logo_url = (
        biz_settings.logo_url
        if biz_settings.ticket_show_logo and biz_settings.logo_url
        else ""
    )

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{app_settings.print_bridge_url}/print",
                json={
                    "printer_name": biz_settings.ticket_printer_name,
                    "data_hex": raw_bytes.hex(),
                    "data_text": text_content,
                    "encoding": "hex",
                    "mode": "auto",  # bridge selects escpos vs text based on printer name
                    "logo_url": logo_url,
                },
            )
            resp.raise_for_status()
    except httpx.TimeoutException:
        log.warning("print_bridge.timeout", sale_id=str(sale_id))
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Print Bridge no respondio a tiempo",
        )
    except httpx.HTTPStatusError as exc:
        log.error(
            "print_bridge.error",
            sale_id=str(sale_id),
            status_code=exc.response.status_code,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Print Bridge respondio con error {exc.response.status_code}",
        )
    except httpx.RequestError as exc:
        log.error("print_bridge.connection_error", sale_id=str(sale_id), error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo conectar al Print Bridge",
        )

    log.info(
        "receipt.printed",
        sale_id=str(sale_id),
        folio=sale_read.folio,
        printer=biz_settings.ticket_printer_name,
    )
    return {"status": "ok", "printer": biz_settings.ticket_printer_name}
