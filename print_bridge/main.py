"""Print Bridge daemon — runs on the HOST machine to access local printers.

This process must run on the host machine (NOT inside Docker).
The POS backend calls it via http://host.docker.internal:9100 (Windows/Mac)
or http://172.17.0.1:9100 (Linux where host.docker.internal is unavailable).

Supported platforms:
    Windows         — pywin32 (RAW spooler)
    macOS           — CUPS via lp command
    Linux / Pi      — CUPS via lp, with fallback to /dev/usb/lpN for raw USB

Usage:
    pip install -r requirements.txt
    python main.py                       # run directly

    Or as a managed service on all platforms:
    python install_service.py install    # auto-start on boot

    Or quick start:
    Windows:         start.bat
    macOS / Linux:   ./start.sh

Port: 9100 (only accessible from localhost / Docker host network)
"""
from __future__ import annotations

import glob
import ipaddress
import logging
import subprocess
import sys
from typing import Any
from urllib.parse import urlparse

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("print_bridge")

app = FastAPI(title="POS Print Bridge", version="1.4.0", docs_url=None, redoc_url=None)

# Allow requests from Docker host network and localhost only.
# CORS is permissive here because access is already restricted at the
# network level — port 9100 should never be exposed beyond localhost.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ─── Virtual-printer detection ──────────────────────────────────────────────

_VIRTUAL_PRINTER_PATTERNS = (
    "pdf", "xps", "onenote", "fax", "print to", "documento", "microsoft"
)


def _is_virtual_printer(name: str) -> bool:
    """Return True if the printer name suggests a virtual/PDF driver.

    Virtual drivers (Microsoft Print to PDF, OneNote, XPS Writer, etc.) do not
    understand raw ESC/POS binary and produce empty 0-byte output files when
    sent RAW spooler data.  These printers require the TEXT datatype instead.
    """
    lower = name.lower()
    return any(pat in lower for pat in _VIRTUAL_PRINTER_PATTERNS)


# ─── Platform helpers ────────────────────────────────────────────────────────

def _cups_available() -> bool:
    """Return True if the lp command is present on this machine."""
    try:
        result = subprocess.run(
            ["which", "lp"],
            capture_output=True,
            text=True,
            timeout=3,
        )
        return result.returncode == 0
    except Exception:
        return False


def _win32print_available() -> bool:
    """Return True if pywin32 is installed and functional."""
    try:
        import win32print  # type: ignore[import]  # noqa: F401
        return True
    except ImportError:
        return False


def _find_usb_printer_device() -> str | None:
    """Return the first /dev/usb/lpN device found, or None."""
    devices = sorted(glob.glob("/dev/usb/lp*"))
    return devices[0] if devices else None


# ─── Printer enumeration ────────────────────────────────────────────────────

def _list_windows_printers() -> list[str]:
    """Return installed printer names on Windows.

    Uses PowerShell Get-Printer (Windows 10/11) as primary method.
    Falls back to wmic for older systems where PowerShell lacks the cmdlet.
    """
    # Primary: PowerShell Get-Printer (reliable on Windows 10 / 11)
    try:
        result = subprocess.run(
            [
                "powershell", "-NoProfile", "-NonInteractive", "-Command",
                "Get-Printer | Select-Object -ExpandProperty Name",
            ],
            capture_output=True,
            text=True,
            timeout=8,
        )
        if result.returncode == 0:
            printers = [ln.strip() for ln in result.stdout.splitlines() if ln.strip()]
            if printers:
                return sorted(printers)
    except Exception as exc:
        log.warning("PowerShell Get-Printer failed: %s", exc)

    # Fallback: wmic (deprecated in Windows 11 but still present on some systems)
    try:
        result = subprocess.run(
            ["wmic", "printer", "get", "name"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            lines = result.stdout.strip().splitlines()
            # First line is the "Name" column header — skip it.
            printers = [ln.strip() for ln in lines[1:] if ln.strip()]
            if printers:
                return sorted(printers)
    except Exception as exc:
        log.warning("wmic enumeration failed: %s", exc)

    return []


def _list_unix_printers() -> list[str]:
    """Return installed printer names on macOS/Linux using lpstat.

    On Linux, if lpstat returns nothing, also scans /dev/usb/lp* for raw USB
    thermal printers that are accessible without CUPS.
    """
    printers: list[str] = []
    try:
        result = subprocess.run(
            ["lpstat", "-a"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        for line in result.stdout.strip().splitlines():
            parts = line.split()
            if parts:
                printers.append(parts[0])
    except Exception as exc:
        log.warning("lpstat enumeration failed: %s", exc)

    # On Linux, fall back to direct USB device detection when CUPS is absent.
    if sys.platform == "linux" and not printers:
        usb_device = _find_usb_printer_device()
        if usb_device:
            printers.append("USB Printer (raw)")
            log.info("Detected raw USB printer at %s", usb_device)

    return sorted(printers)


# ─── Print backends ─────────────────────────────────────────────────────────

def _print_windows(printer_name: str, raw_bytes: bytes) -> dict[str, str]:
    """Send raw ESC/POS bytes via the Windows spooler (pywin32)."""
    try:
        import win32print  # type: ignore[import]
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="pywin32 not installed. Run: pip install pywin32",
        )
    try:
        hprinter = win32print.OpenPrinter(printer_name)
        try:
            win32print.StartDocPrinter(hprinter, 1, ("POS Ticket", None, "RAW"))
            win32print.StartPagePrinter(hprinter)
            win32print.WritePrinter(hprinter, raw_bytes)
            win32print.EndPagePrinter(hprinter)
            win32print.EndDocPrinter(hprinter)
        finally:
            win32print.ClosePrinter(hprinter)
        log.info("Print job completed: printer=%r  bytes=%d", printer_name, len(raw_bytes))
        return {"status": "ok", "printer": printer_name}
    except Exception as exc:
        log.error("Print failed: printer=%r  error=%s", printer_name, exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _gdi_draw_logo(dc: Any, logo_url: str, dpi_x: int, dpi_y: int, top_y: int) -> int:
    """Download *logo_url* and draw it centred on *dc* starting at *top_y*.

    Returns the new Y position after the logo + a small gap.
    If the download or render fails the logo is silently skipped and *top_y*
    is returned unchanged so the text still prints.

    Requires Pillow (``pip install Pillow``).
    """
    try:
        import io
        import urllib.request
        from PIL import Image, ImageWin  # type: ignore[import]
        import win32con  # type: ignore[import]
    except ImportError as exc:
        log.warning("Logo skipped — missing dependency: %s", exc)
        return top_y

    try:
        parsed = urlparse(logo_url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            log.warning("Logo URL invalid scheme, skipping: %s", logo_url[:100])
            return top_y
        # Block requests to private/loopback IPs (SSRF protection)
        try:
            ip = ipaddress.ip_address(parsed.hostname or "")
            if ip.is_private or ip.is_loopback or ip.is_link_local:
                log.warning("Logo URL points to private IP, skipping SSRF protection")
                return top_y
        except ValueError:
            pass  # hostname is a domain name, not an IP — that's fine

        with urllib.request.urlopen(logo_url, timeout=5) as resp:  # noqa: S310
            img_bytes = resp.read()

        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

        # Fit logo to at most 2 inches wide while preserving aspect ratio.
        max_w = int(dpi_x * 2.0)
        if img.width > max_w:
            ratio = max_w / img.width
            img = img.resize(
                (max_w, int(img.height * ratio)),
                Image.LANCZOS,
            )

        logo_w, logo_h = img.size

        # Centre horizontally within the printable area.
        page_w = dc.GetDeviceCaps(win32con.HORZRES)
        x = max(0, (page_w - logo_w) // 2)

        dib = ImageWin.Dib(img)
        dib.draw(dc.GetHandleAttrib(), (x, top_y, x + logo_w, top_y + logo_h))

        log.info("Logo drawn: url=%r  size=%dx%d", logo_url, logo_w, logo_h)

        # Return Y below logo + 0.1-inch breathing room.
        return top_y + logo_h + int(dpi_y * 0.1)

    except Exception as exc:
        log.warning("Logo render failed, skipping: %s", exc)
        return top_y


def _print_windows_text(
    printer_name: str,
    text: str,
    logo_url: str = "",
) -> dict[str, str]:
    """Render plain text on any Windows printer using the GDI pipeline.

    Deliberately avoids the TEXT spooler datatype (error 1804 on modern
    drivers).  Instead this drives the printer through win32ui / GDI so
    Windows renders the text exactly as any normal application would —
    Courier New monospace, fixed margins, proper line spacing.

    Works with:
    * Microsoft Print to PDF   (produces a PDF with readable content)
    * OneNote / XPS Writer     (same GDI rendering)
    * Real thermal / inkjet    (fallback — ESC/POS is preferred for those)

    If *logo_url* is provided the logo is drawn first (centred, max 2 in wide)
    and the text begins below it.  Requires Pillow for logo rendering.
    """
    try:
        import win32ui  # type: ignore[import]
        import win32con  # type: ignore[import]
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="pywin32 not installed. Run: pip install pywin32",
        )

    dc = None
    font = None
    old_font = None
    try:
        dc = win32ui.CreateDC()
        dc.CreatePrinterDC(printer_name)

        # Physical resolution of the printer in dots-per-inch.
        dpi_x = dc.GetDeviceCaps(win32con.LOGPIXELSX)
        dpi_y = dc.GetDeviceCaps(win32con.LOGPIXELSY)

        # 9-point Courier New — negative height means "cell height" in GDI.
        font_height = -int(dpi_y * 9 / 72)
        font = win32ui.CreateFont({
            "name": "Courier New",
            "height": font_height,
            "weight": win32con.FW_NORMAL,
        })

        dc.StartDoc("POS Ticket")
        dc.StartPage()
        old_font = dc.SelectObject(font)

        margin_x = int(dpi_x * 0.25)
        margin_y = int(dpi_y * 0.25)
        line_height = int(abs(font_height) * 1.15)

        # ── Logo (optional) ──────────────────────────────────────────────────
        y = margin_y
        if logo_url:
            y = _gdi_draw_logo(dc, logo_url, dpi_x, dpi_y, y)

        # ── Text lines ───────────────────────────────────────────────────────
        for line in text.split("\n"):
            dc.TextOut(margin_x, y, line)
            y += line_height

        dc.EndPage()
        dc.EndDoc()

        log.info(
            "GDI text print completed: printer=%r  lines=%d  logo=%s",
            printer_name,
            len(text.splitlines()),
            bool(logo_url),
        )
        return {"status": "ok", "printer": printer_name, "mode": "text"}

    except Exception as exc:
        log.error("GDI text print failed: printer=%r  error=%s", printer_name, exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    finally:
        if old_font is not None and dc is not None:
            try:
                dc.SelectObject(old_font)
            except Exception:
                pass
        if font is not None:
            try:
                font.DeleteObject()
            except Exception:
                pass
        if dc is not None:
            try:
                dc.DeleteDC()
            except Exception:
                pass


def _print_cups_text(printer_name: str, text: str) -> dict[str, str]:
    """Send plain text to a CUPS printer (macOS / Linux).

    Uses ``lp -d <name>`` without the ``-o raw`` flag so CUPS renders the
    text through the printer driver rather than passing it verbatim.
    """
    try:
        result = subprocess.run(
            ["lp", "-d", printer_name, "-"],
            input=text.encode("utf-8"),
            capture_output=True,
            timeout=10,
        )
        if result.returncode != 0:
            err = result.stderr.decode(errors="replace")
            raise HTTPException(status_code=500, detail=err)
        log.info("Text print completed via CUPS: printer=%r", printer_name)
        return {"status": "ok", "printer": printer_name, "mode": "text"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _print_raw_usb(printer_name: str, raw_bytes: bytes) -> dict[str, str]:
    """Write raw ESC/POS bytes directly to /dev/usb/lpN.

    Used on Raspberry Pi / Linux when CUPS is not installed but the thermal
    printer is connected via USB and exposed as a raw device.
    """
    device = _find_usb_printer_device()
    if not device:
        raise HTTPException(
            status_code=503,
            detail="No USB printer device found at /dev/usb/lp*",
        )
    try:
        with open(device, "wb") as f:
            f.write(raw_bytes)
        log.info(
            "Raw USB print completed: device=%r  bytes=%d",
            device,
            len(raw_bytes),
        )
        return {"status": "ok", "printer": printer_name, "device": device}
    except PermissionError:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Permission denied on {device}. "
                f"Run: sudo usermod -a -G lp $(whoami) && newgrp lp"
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _print_cups(printer_name: str, raw_bytes: bytes) -> dict[str, str]:
    """Send raw ESC/POS bytes via CUPS (lp command).

    Falls back to direct USB device write on Linux if lp fails and a
    /dev/usb/lpN device is present — important for Raspberry Pi without CUPS.
    """
    try:
        result = subprocess.run(
            ["lp", "-d", printer_name, "-o", "raw", "-"],
            input=raw_bytes,
            capture_output=True,
            timeout=10,
        )
        if result.returncode == 0:
            log.info("Print job completed via CUPS: printer=%r", printer_name)
            return {"status": "ok", "printer": printer_name}

        err = result.stderr.decode(errors="replace")
        log.warning("lp failed (code %d): %s", result.returncode, err)

        # On Linux, try raw USB fallback before giving up.
        if sys.platform == "linux":
            log.info("Attempting raw USB fallback for printer=%r", printer_name)
            return _print_raw_usb(printer_name, raw_bytes)

        raise HTTPException(status_code=500, detail=err)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─── Routes ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health(request: Request) -> dict[str, str]:
    log.info("Health check from %s", request.client.host if request.client else "?")
    return {"status": "ok", "platform": sys.platform, "version": "1.4.0"}


@app.get("/status")
async def get_status() -> dict[str, Any]:
    """Return platform capabilities and available print paths."""
    usb_device: str | None = None
    if sys.platform == "linux":
        usb_device = _find_usb_printer_device()

    # Report whether any configured/detected printer looks like a virtual driver.
    if sys.platform == "win32":
        printers = _list_windows_printers()
    else:
        printers = _list_unix_printers()
    virtual_printer_detected = any(_is_virtual_printer(p) for p in printers)

    return {
        "platform": sys.platform,
        "version": "1.4.0",
        "cups_available": _cups_available() if sys.platform != "win32" else False,
        "win32print_available": _win32print_available() if sys.platform == "win32" else False,
        "usb_raw_device": usb_device,  # e.g. "/dev/usb/lp0" or None
        "virtual_printer_detected": virtual_printer_detected,
    }


@app.get("/printers")
async def list_printers() -> dict[str, Any]:
    """List all available printers installed on this machine."""
    if sys.platform == "win32":
        printers = _list_windows_printers()
    else:
        printers = _list_unix_printers()

    log.info("Printers listed: %d found", len(printers))
    return {"printers": printers, "available": True, "platform": sys.platform}


class PrintJob(BaseModel):
    printer_name: str
    # ESC/POS command bytes encoded as a hex string — used when mode="escpos"
    data_hex: str = ""
    # Plain text content — used when mode="text" (PDF / virtual printers)
    data_text: str = ""
    encoding: str = "hex"
    # "auto"   → detect based on printer name (_is_virtual_printer)
    # "escpos" → always send raw ESC/POS binary (real thermal printers)
    # "text"   → always send plain text (PDF / virtual / inkjet printers)
    mode: str = "auto"
    # Optional logo URL — drawn at the top of the page (GDI mode) or as ESC/POS
    # raster bitmap (escpos mode).  Empty string = no logo.
    logo_url: str = ""


@app.post("/print")
async def send_print_job(job: PrintJob, request: Request) -> dict[str, str]:
    """Send a print job to the specified printer.

    Supports two modes:
    * ``escpos`` — raw binary ESC/POS bytes sent via RAW spooler datatype.
                   Works with real thermal printers.
    * ``text``   — plain text sent via TEXT spooler datatype (Windows) or
                   standard CUPS (Unix).  Required for PDF/virtual drivers
                   that produce empty files when receiving ESC/POS binary.

    When ``mode="auto"`` the bridge selects based on the printer name:
    virtual/PDF printer names → ``text``, everything else → ``escpos``.
    """
    log.info(
        "Print job from %s → printer=%r  mode=%r  hex_bytes=%d  text_chars=%d",
        request.client.host if request.client else "?",
        job.printer_name,
        job.mode,
        len(job.data_hex) // 2,
        len(job.data_text),
    )

    # Resolve effective mode
    effective_mode = job.mode
    if effective_mode == "auto":
        if sys.platform == "win32" and _is_virtual_printer(job.printer_name):
            effective_mode = "text"
        else:
            effective_mode = "escpos"

    if sys.platform == "win32":
        if effective_mode == "text":
            if not job.data_text:
                raise HTTPException(
                    status_code=422,
                    detail="data_text is required when mode='text'",
                )
            return _print_windows_text(job.printer_name, job.data_text, logo_url=job.logo_url)
        else:
            # escpos mode — raw binary
            if not job.data_hex:
                raise HTTPException(
                    status_code=422,
                    detail="data_hex is required when mode='escpos'",
                )
            try:
                raw_bytes = bytes.fromhex(job.data_hex)
            except ValueError as exc:
                raise HTTPException(
                    status_code=422, detail=f"Invalid hex data: {exc}"
                ) from exc
            return _print_windows(job.printer_name, raw_bytes)
    else:
        # Unix (macOS / Linux)
        if effective_mode == "text":
            if not job.data_text:
                raise HTTPException(
                    status_code=422,
                    detail="data_text is required when mode='text'",
                )
            return _print_cups_text(job.printer_name, job.data_text)
        else:
            if not job.data_hex:
                raise HTTPException(
                    status_code=422,
                    detail="data_hex is required when mode='escpos'",
                )
            try:
                raw_bytes = bytes.fromhex(job.data_hex)
            except ValueError as exc:
                raise HTTPException(
                    status_code=422, detail=f"Invalid hex data: {exc}"
                ) from exc
            return _print_cups(job.printer_name, raw_bytes)


# ─── Entry point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    log.info("Starting POS Print Bridge v1.4.0 on port 9100 — platform: %s", sys.platform)
    log.info("Backend connects via: http://host.docker.internal:9100")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=9100,
        log_level="info",
        access_log=False,  # requests are logged manually above
    )
