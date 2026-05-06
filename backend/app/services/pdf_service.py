from __future__ import annotations

from datetime import date
from decimal import Decimal
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.services.report_service import DailySummary

# ---------------------------------------------------------------------------
# Shared styles
# ---------------------------------------------------------------------------

_STYLES = getSampleStyleSheet()

_HEADER_STYLE = ParagraphStyle(
    "PosHeader",
    parent=_STYLES["Heading1"],
    fontSize=16,
    spaceAfter=4,
)
_SUB_STYLE = ParagraphStyle(
    "PosSub",
    parent=_STYLES["Normal"],
    fontSize=10,
    textColor=colors.HexColor("#555555"),
    spaceAfter=12,
)
_SECTION_STYLE = ParagraphStyle(
    "PosSection",
    parent=_STYLES["Heading2"],
    fontSize=12,
    spaceBefore=12,
    spaceAfter=6,
)
_NORMAL = _STYLES["Normal"]

_TABLE_HEADER_BG = colors.HexColor("#1e3a5f")
_ROW_ALT_BG = colors.HexColor("#f0f4f8")
_LOW_STOCK_BG = colors.HexColor("#fee2e2")


def _base_table_style(col_count: int) -> TableStyle:
    """Return a standard table style (header row + alternating rows)."""
    return TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), _TABLE_HEADER_BG),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _ROW_ALT_BG]),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cccccc")),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]
    )


def _fmt_mxn(value: Decimal | None) -> str:
    if value is None:
        return "$0.00"
    return f"${value:,.2f}"


# ---------------------------------------------------------------------------
# Public generators
# ---------------------------------------------------------------------------


def generate_daily_summary_pdf(summary: DailySummary, business_name: str) -> bytes:
    """Return PDF bytes for a daily sales summary.

    Layout: header block → KPI boxes row → top-products table → cashier sessions table.
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )
    story = []

    # --- Header --------------------------------------------------------------
    story.append(Paragraph(business_name, _HEADER_STYLE))
    story.append(
        Paragraph(
            f"Reporte diario — {summary.date.strftime('%d/%m/%Y')}",
            _SUB_STYLE,
        )
    )

    # --- KPI summary table ---------------------------------------------------
    kpi_data = [
        ["Ventas", "Ingreso MXN", "Ingreso USD", "Efectivo", "Tarjeta", "Gift Card"],
        [
            str(summary.total_sales),
            _fmt_mxn(summary.total_revenue_mxn),
            f"${summary.total_revenue_usd:,.2f}",
            _fmt_mxn(summary.cash_total),
            _fmt_mxn(summary.card_total),
            _fmt_mxn(summary.gift_card_total),
        ],
    ]
    kpi_table = Table(kpi_data, hAlign="LEFT")
    kpi_table.setStyle(_base_table_style(6))
    story.append(kpi_table)
    story.append(Spacer(1, 10))

    # --- Top products --------------------------------------------------------
    story.append(Paragraph("Top productos", _SECTION_STYLE))

    if summary.top_products:
        prod_data = [["#", "Producto", "Cantidad", "Ingresos MXN"]]
        for i, p in enumerate(summary.top_products, start=1):
            prod_data.append(
                [
                    str(i),
                    str(p["name"]),
                    f"{p['qty']:,.3f}",
                    _fmt_mxn(p["revenue"]),
                ]
            )
        prod_table = Table(prod_data, colWidths=[20, None, 70, 90], hAlign="LEFT")
        prod_table.setStyle(_base_table_style(4))
        story.append(prod_table)
    else:
        story.append(Paragraph("Sin ventas registradas.", _NORMAL))

    story.append(Spacer(1, 10))

    # --- Cashier sessions ----------------------------------------------------
    story.append(Paragraph("Sesiones de caja", _SECTION_STYLE))

    if summary.cashier_sessions:
        cs_data = [["Estado", "Apertura", "Cierre", "Ventas MXN", "Efectivo", "Tarjeta"]]
        for cs in summary.cashier_sessions:
            cs_data.append(
                [
                    cs.get("status", ""),
                    cs["opened_at"].strftime("%H:%M") if cs.get("opened_at") else "",
                    cs["closed_at"].strftime("%H:%M") if cs.get("closed_at") else "—",
                    _fmt_mxn(cs.get("total_sales_mxn")),
                    _fmt_mxn(cs.get("total_cash_payments")),
                    _fmt_mxn(cs.get("total_card_payments")),
                ]
            )
        cs_table = Table(cs_data, hAlign="LEFT")
        cs_table.setStyle(_base_table_style(6))
        story.append(cs_table)
    else:
        story.append(Paragraph("Sin sesiones de caja.", _NORMAL))

    doc.build(story)
    return buf.getvalue()


def generate_sales_report_pdf(
    rows: list[dict],
    date_from: date,
    date_to: date,
    business_name: str,
) -> bytes:
    """Return PDF bytes for a period sales report.

    Table columns: Fecha | Período | No. ventas | Total MXN.
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )
    story = []

    story.append(Paragraph(business_name, _HEADER_STYLE))
    story.append(
        Paragraph(
            f"Reporte de ventas — {date_from.strftime('%d/%m/%Y')} a {date_to.strftime('%d/%m/%Y')}",
            _SUB_STYLE,
        )
    )

    if rows:
        table_data = [["Período", "No. ventas", "Total MXN"]]
        for r in rows:
            table_data.append(
                [
                    str(r.get("period", "")),
                    str(r.get("count", 0)),
                    _fmt_mxn(r.get("total_mxn")),
                ]
            )
        t = Table(table_data, colWidths=[120, 80, 100], hAlign="LEFT")
        t.setStyle(_base_table_style(3))
        story.append(t)
    else:
        story.append(Paragraph("Sin datos para el período seleccionado.", _NORMAL))

    doc.build(story)
    return buf.getvalue()


def generate_inventory_pdf(rows: list[dict], business_name: str) -> bytes:
    """Return PDF bytes for the current inventory report.

    Table columns: SKU | Nombre | Stock | Mínimo | Estado.
    Rows with low stock are highlighted in red.
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )
    story = []

    story.append(Paragraph(business_name, _HEADER_STYLE))
    story.append(Paragraph("Reporte de inventario", _SUB_STYLE))

    if rows:
        table_data = [["SKU", "Nombre", "Stock actual", "Stock mínimo", "Estado"]]
        low_indices: list[int] = []

        for idx, r in enumerate(rows, start=1):
            is_low = r.get("is_low_stock", False)
            status = "BAJO" if is_low else "OK"
            if is_low:
                low_indices.append(idx)
            table_data.append(
                [
                    r.get("sku", ""),
                    r.get("name", ""),
                    f"{r.get('stock_quantity', 0):,.3f}",
                    f"{r.get('reorder_point', 0) or 0:,.3f}",
                    status,
                ]
            )

        t = Table(table_data, colWidths=[60, None, 80, 80, 50], hAlign="LEFT")
        style = _base_table_style(5)
        for row_idx in low_indices:
            style.add("BACKGROUND", (0, row_idx), (-1, row_idx), _LOW_STOCK_BG)
            style.add("TEXTCOLOR", (4, row_idx), (4, row_idx), colors.red)
            style.add("FONTNAME", (4, row_idx), (4, row_idx), "Helvetica-Bold")
        t.setStyle(style)
        story.append(t)
    else:
        story.append(Paragraph("Sin productos registrados.", _NORMAL))

    doc.build(story)
    return buf.getvalue()


def generate_receipt_pdf(sale: dict, business_name: str) -> bytes:
    """Return a thermal-style receipt as PDF (~80 mm / 210 pt wide).

    The *sale* dict must contain:
        folio, created_at, items (list of item dicts), total_mxn, total_usd,
        payments (list of payment dicts), receipt_footer (optional).
    """
    RECEIPT_WIDTH = 210  # ~80 mm in points
    RECEIPT_HEIGHT = A4[1]

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=(RECEIPT_WIDTH, RECEIPT_HEIGHT),
        leftMargin=8,
        rightMargin=8,
        topMargin=12,
        bottomMargin=12,
    )

    center_style = ParagraphStyle(
        "RcptCenter",
        parent=_NORMAL,
        fontSize=8,
        alignment=1,  # CENTER
        leading=11,
    )
    bold_center = ParagraphStyle(
        "RcptBoldCenter",
        parent=center_style,
        fontName="Helvetica-Bold",
        fontSize=9,
    )
    small = ParagraphStyle("RcptSmall", parent=_NORMAL, fontSize=7, leading=10)

    story = []

    # Header
    story.append(Paragraph(f"<b>{business_name}</b>", bold_center))
    story.append(Spacer(1, 4))

    created_at = sale.get("created_at", "")
    if hasattr(created_at, "strftime"):
        created_at = created_at.strftime("%d/%m/%Y %H:%M")
    story.append(Paragraph(f"Folio: <b>{sale.get('folio', '')}</b>", center_style))
    story.append(Paragraph(str(created_at), center_style))
    story.append(Spacer(1, 6))

    # Items
    items = sale.get("items", [])
    if items:
        item_data = [["Producto", "Cant", "P.U.", "Total"]]
        for it in items:
            item_data.append(
                [
                    str(it.get("name", "")),
                    f"{it.get('quantity', 0):,.2f}",
                    _fmt_mxn(it.get("unit_price_mxn")),
                    _fmt_mxn(it.get("subtotal_mxn")),
                ]
            )
        item_table = Table(
            item_data,
            colWidths=[80, 26, 42, 44],
            hAlign="CENTER",
        )
        item_style = TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.black),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ]
        )
        item_table.setStyle(item_style)
        story.append(item_table)

    story.append(Spacer(1, 4))

    # Totals
    total_data = [
        ["Subtotal:", _fmt_mxn(sale.get("subtotal_mxn"))],
        ["Descuento:", _fmt_mxn(sale.get("discount_mxn", Decimal("0")))],
        ["IVA:", _fmt_mxn(sale.get("tax_mxn", Decimal("0")))],
        ["TOTAL MXN:", _fmt_mxn(sale.get("total_mxn"))],
        ["TOTAL USD:", f"${sale.get('total_usd', Decimal('0')):,.2f}"],
    ]
    total_table = Table(total_data, colWidths=[100, 90], hAlign="RIGHT")
    total_style = TableStyle(
        [
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("FONTNAME", (0, 3), (-1, 3), "Helvetica-Bold"),
            ("FONTNAME", (0, 4), (-1, 4), "Helvetica-Bold"),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("LEFTPADDING", (0, 0), (-1, -1), 2),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ]
    )
    total_table.setStyle(total_style)
    story.append(total_table)
    story.append(Spacer(1, 4))

    # Payments
    payments = sale.get("payments", [])
    if payments:
        pay_data = [["Forma de pago", "Monto"]]
        for pmt in payments:
            pay_data.append(
                [
                    str(pmt.get("method", "")),
                    _fmt_mxn(pmt.get("amount_in_mxn")),
                ]
            )
        pay_table = Table(pay_data, colWidths=[100, 90], hAlign="CENTER")
        pay_style = TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.black),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ]
        )
        pay_table.setStyle(pay_style)
        story.append(pay_table)

    # Footer
    footer = sale.get("receipt_footer") or ""
    if footer:
        story.append(Spacer(1, 6))
        story.append(Paragraph(str(footer), center_style))

    doc.build(story)
    return buf.getvalue()
