"""
receipt_service.py — Build raw ESC/POS bytes for a sale ticket.

No external ESC/POS library is required. All byte sequences are
hand-crafted using the constants below (standard ESC/POS spec).
"""

from __future__ import annotations

from app.models.business_settings import BusinessSettings
from app.schemas.operations import SaleRead

# ── ESC/POS constants ────────────────────────────────────────────────────────

ESC = b"\x1b"
GS = b"\x1d"

INIT = ESC + b"@"
BOLD_ON = ESC + b"E\x01"
BOLD_OFF = ESC + b"E\x00"
ALIGN_LEFT = ESC + b"a\x00"
ALIGN_CENTER = ESC + b"a\x01"
FONT_NORMAL = ESC + b"!\x00"
FONT_LARGE = ESC + b"!\x30"  # double height + width
NEWLINE = b"\n"
CUT_PARTIAL = GS + b"V\x41\x00"

COLS = 42  # standard 80 mm thermal roll


# ── Helper utilities ─────────────────────────────────────────────────────────


def _encode(text: str) -> bytes:
    """Encode a string to latin-1, replacing unmappable characters."""
    return text.encode("latin-1", errors="replace")


def _center(text: str, cols: int = COLS) -> str:
    """Return *text* padded to be centred within *cols* characters."""
    if len(text) >= cols:
        return text[:cols]
    pad = (cols - len(text)) // 2
    return " " * pad + text


def _cols(left: str, right: str, cols: int = COLS) -> str:
    """Left-justify *left* and right-justify *right* within *cols* chars total."""
    available = cols - len(right)
    if available < 1:
        # Right side is too long — truncate left entirely
        return right[:cols]
    left_truncated = left[: available - 1] if len(left) >= available else left
    return left_truncated.ljust(available) + right


def _line(cols: int = COLS, char: str = "-") -> str:
    """Return a separator line of *char* repeated *cols* times."""
    return char * cols


def _money(value: float) -> str:
    """Format a float as Mexican peso currency string."""
    return f"${value:,.2f}"


# ── Main builder ─────────────────────────────────────────────────────────────


def build_receipt(
    sale: SaleRead,
    settings: BusinessSettings,
) -> bytes:
    """
    Generate raw ESC/POS bytes for *sale* using *settings* for branding.

    Returns:
        bytes: Complete byte sequence ready to be sent to a thermal printer.
    """
    buf: list[bytes] = []

    # ── 1. Init + centre alignment ────────────────────────────────────────────
    buf.append(INIT)
    buf.append(ALIGN_CENTER)

    # ── 2. Header ─────────────────────────────────────────────────────────────
    if settings.ticket_header:
        lines = settings.ticket_header.strip().splitlines()
        for idx, header_line in enumerate(lines):
            if idx == 0:
                buf.append(BOLD_ON)
                buf.append(_encode(_center(header_line)))
                buf.append(NEWLINE)
                buf.append(BOLD_OFF)
            else:
                buf.append(_encode(_center(header_line)))
                buf.append(NEWLINE)

    # ── 3. Blank line ─────────────────────────────────────────────────────────
    buf.append(NEWLINE)

    # ── 4. Folio (large + bold) ───────────────────────────────────────────────
    buf.append(FONT_LARGE)
    buf.append(BOLD_ON)
    buf.append(_encode(_center(sale.folio)))
    buf.append(NEWLINE)
    buf.append(BOLD_OFF)
    buf.append(FONT_NORMAL)

    # ── 5. Date / time ────────────────────────────────────────────────────────
    dt_str = sale.created_at.strftime("%d/%m/%Y %H:%M")
    buf.append(_encode(_center(dt_str)))
    buf.append(NEWLINE)

    # ── 6. Left align + separator ─────────────────────────────────────────────
    buf.append(ALIGN_LEFT)
    buf.append(_encode(_line()))
    buf.append(NEWLINE)

    # ── 7. "ARTÍCULOS" label ──────────────────────────────────────────────────
    buf.append(BOLD_ON)
    buf.append(_encode("ARTICULOS"))
    buf.append(NEWLINE)
    buf.append(BOLD_OFF)

    # ── 8. Items ──────────────────────────────────────────────────────────────
    for item in sale.items:
        unit_price = float(item.unit_price_mxn)
        subtotal = float(item.subtotal_mxn)
        qty = float(item.quantity)

        # Product name line (truncated to COLS)
        name = item.product_name_snapshot[:COLS]
        buf.append(_encode(name))
        buf.append(NEWLINE)

        # Detail line: "  SKU x qty  @  $unit_price  =  $subtotal"
        detail = (
            f"  {item.product_sku_snapshot} x {qty:g}"
            f"  @  {_money(unit_price)}"
            f"  =  {_money(subtotal)}"
        )
        # Truncate if needed
        buf.append(_encode(detail[:COLS]))
        buf.append(NEWLINE)

    # ── 9. Separator ──────────────────────────────────────────────────────────
    buf.append(_encode(_line()))
    buf.append(NEWLINE)

    # ── 10. Totals ────────────────────────────────────────────────────────────
    subtotal_val = float(sale.subtotal_mxn)
    tax_val = float(sale.tax_mxn)
    total_val = float(sale.total_mxn)
    discount_val = float(sale.discount_mxn)

    if settings.ticket_show_iva:
        buf.append(_encode(_cols("Subtotal", _money(subtotal_val))))
        buf.append(NEWLINE)
        buf.append(_encode(_cols("IVA (16%)", _money(tax_val))))
        buf.append(NEWLINE)

    # Bold total line
    buf.append(BOLD_ON)
    buf.append(_encode(_cols("TOTAL", _money(total_val))))
    buf.append(NEWLINE)
    buf.append(BOLD_OFF)

    # ── 11. Discount (if any) ─────────────────────────────────────────────────
    if discount_val > 0:
        buf.append(_encode(_cols("Descuento", f"-{_money(discount_val)}")))
        buf.append(NEWLINE)

    # ── 12. Separator ─────────────────────────────────────────────────────────
    buf.append(_encode(_line()))
    buf.append(NEWLINE)

    # ── 13. "MÉTODO DE PAGO" label ────────────────────────────────────────────
    buf.append(BOLD_ON)
    buf.append(_encode("METODO DE PAGO"))
    buf.append(NEWLINE)
    buf.append(BOLD_OFF)

    # ── 14. Payments ──────────────────────────────────────────────────────────
    METHOD_LABELS: dict[str, str] = {
        "cash": "Efectivo",
        "credit_card": "T. Credito",
        "debit_card": "T. Debito",
        "gift_card": "Vale/Gift card",
        "transfer": "Transferencia",
        "loyalty_points": "Puntos",
        "other": "Otro",
    }
    total_paid = 0.0
    for payment in sale.payments:
        label = METHOD_LABELS.get(payment.method, payment.method.capitalize())
        amount = float(payment.amount_in_mxn)
        total_paid += amount
        buf.append(_encode(_cols(label, _money(amount))))
        buf.append(NEWLINE)

    # ── 15. Change ────────────────────────────────────────────────────────────
    change = total_paid - total_val
    if change > 0.005:  # ignore floating-point dust
        buf.append(_encode(_cols("CAMBIO", _money(change))))
        buf.append(NEWLINE)

    # ── 16. Separator ─────────────────────────────────────────────────────────
    buf.append(_encode(_line()))
    buf.append(NEWLINE)

    # ── 17. Footer ────────────────────────────────────────────────────────────
    if settings.ticket_footer:
        buf.append(ALIGN_CENTER)
        for footer_line in settings.ticket_footer.strip().splitlines():
            buf.append(_encode(_center(footer_line)))
            buf.append(NEWLINE)

    # ── 18. Feed + cut ────────────────────────────────────────────────────────
    buf.append(NEWLINE)
    buf.append(NEWLINE)
    buf.append(NEWLINE)
    buf.append(CUT_PARTIAL)

    return b"".join(buf)


# ── Plain-text builder ────────────────────────────────────────────────────────


def build_receipt_text(
    sale: SaleRead,
    settings: BusinessSettings,
) -> str:
    """Generate the receipt as plain UTF-8 text (no ESC/POS control bytes).

    Produces the same layout as ``build_receipt`` using the same COLS=42
    helpers, but outputs a human-readable string instead of binary.

    Used for:
    * PDF / virtual printer drivers (Microsoft Print to PDF, OneNote, XPS)
      that cannot render raw ESC/POS bytes and produce empty output files.
    * The ``receipt-preview`` debug endpoint.

    Returns:
        str: Newline-separated plain text, ready to encode as UTF-8 or CP1252.
    """
    lines: list[str] = []

    # ── 1. Header ─────────────────────────────────────────────────────────────
    if settings.ticket_header:
        for header_line in settings.ticket_header.strip().splitlines():
            lines.append(_center(header_line))
    lines.append("")

    # ── 2. Folio + date ───────────────────────────────────────────────────────
    lines.append(_center(sale.folio))
    lines.append(_center(sale.created_at.strftime("%d/%m/%Y %H:%M")))
    lines.append(_line())

    # ── 3. Items ──────────────────────────────────────────────────────────────
    lines.append("ARTICULOS")
    for item in sale.items:
        unit_price = float(item.unit_price_mxn)
        subtotal = float(item.subtotal_mxn)
        qty = float(item.quantity)
        lines.append(item.product_name_snapshot[:COLS])
        detail = (
            f"  {item.product_sku_snapshot} x {qty:g}"
            f"  @  {_money(unit_price)}"
            f"  =  {_money(subtotal)}"
        )
        lines.append(detail[:COLS])

    # ── 4. Separator ──────────────────────────────────────────────────────────
    lines.append(_line())

    # ── 5. Totals ─────────────────────────────────────────────────────────────
    subtotal_val = float(sale.subtotal_mxn)
    tax_val = float(sale.tax_mxn)
    total_val = float(sale.total_mxn)
    discount_val = float(sale.discount_mxn)

    if settings.ticket_show_iva:
        lines.append(_cols("Subtotal", _money(subtotal_val)))
        lines.append(_cols("IVA (16%)", _money(tax_val)))
    lines.append(_cols("TOTAL", _money(total_val)))

    if discount_val > 0:
        lines.append(_cols("Descuento", f"-{_money(discount_val)}"))

    # ── 6. Separator ──────────────────────────────────────────────────────────
    lines.append(_line())

    # ── 7. Payments ───────────────────────────────────────────────────────────
    lines.append("METODO DE PAGO")
    METHOD_LABELS: dict[str, str] = {
        "cash": "Efectivo",
        "credit_card": "T. Credito",
        "debit_card": "T. Debito",
        "gift_card": "Vale/Gift card",
        "transfer": "Transferencia",
        "loyalty_points": "Puntos",
        "other": "Otro",
    }
    total_paid = 0.0
    for payment in sale.payments:
        label = METHOD_LABELS.get(payment.method, payment.method.capitalize())
        amount = float(payment.amount_in_mxn)
        total_paid += amount
        lines.append(_cols(label, _money(amount)))

    # ── 8. Change ─────────────────────────────────────────────────────────────
    change = total_paid - total_val
    if change > 0.005:  # ignore floating-point dust
        lines.append(_cols("CAMBIO", _money(change)))

    # ── 9. Separator ──────────────────────────────────────────────────────────
    lines.append(_line())

    # ── 10. Footer ────────────────────────────────────────────────────────────
    if settings.ticket_footer:
        for footer_line in settings.ticket_footer.strip().splitlines():
            lines.append(_center(footer_line))

    # Trailing blank lines for visual spacing on PDF output
    lines.append("")
    lines.append("")

    return "\n".join(lines)
