"""
POS Print Bridge — Host daemon for USB thermal printer access.
Runs on http://localhost:9100
NOT a Docker service — must run on the host machine.
"""
from __future__ import annotations

import sys
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Any

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

PORT = 9100
VERSION = "2026.05.06.1"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    log.info("Print Bridge %s starting on port %d", VERSION, PORT)
    yield
    log.info("Print Bridge shutting down")


app = FastAPI(
    title="POS Print Bridge",
    version=VERSION,
    docs_url="/docs",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:3000", "http://127.0.0.1"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class PrinterInfo(BaseModel):
    name: str
    vendor_id: str
    product_id: str
    status: str


class ReceiptLine(BaseModel):
    type: str  # "text" | "bold" | "center" | "divider" | "barcode" | "qr" | "cut"
    content: str = ""
    align: str = "left"
    font_size: int = 1


class PrintRequest(BaseModel):
    printer_name: str | None = None
    vendor_id: str | None = None
    product_id: str | None = None
    lines: list[ReceiptLine]
    cut: bool = True
    open_drawer: bool = False


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": VERSION, "port": str(PORT)}


@app.get("/printers")
async def list_printers() -> dict[str, Any]:
    """List available USB printers."""
    try:
        import usb.core  # type: ignore[import]
        # Look for common thermal printer USB class (7 = printer)
        devices = list(usb.core.find(find_all=True, bDeviceClass=7) or [])
        printers = [
            {
                "vendor_id": hex(d.idVendor),
                "product_id": hex(d.idProduct),
                "name": f"USB Printer {hex(d.idVendor)}:{hex(d.idProduct)}",
                "status": "available",
            }
            for d in devices
        ]
        return {"printers": printers, "count": len(printers)}
    except ImportError:
        return {"printers": [], "count": 0, "note": "pyusb not available"}
    except Exception as exc:
        log.warning("Could not enumerate USB printers: %s", exc)
        return {"printers": [], "count": 0, "error": str(exc)}


@app.post("/print")
async def print_receipt(req: PrintRequest) -> dict[str, str]:
    """Send receipt to USB thermal printer via ESC/POS."""
    try:
        from escpos.printer import Usb  # type: ignore[import]

        if not req.vendor_id or not req.product_id:
            raise HTTPException(
                status_code=400,
                detail="vendor_id and product_id required for USB printing",
            )

        vid = int(req.vendor_id, 16) if req.vendor_id.startswith("0x") else int(req.vendor_id, 16)
        pid = int(req.product_id, 16) if req.product_id.startswith("0x") else int(req.product_id, 16)

        printer = Usb(vid, pid)

        for line in req.lines:
            if line.type == "text":
                printer.text(line.content + "\n")
            elif line.type == "bold":
                printer.set(bold=True)
                printer.text(line.content + "\n")
                printer.set(bold=False)
            elif line.type == "center":
                printer.set(align="center")
                printer.text(line.content + "\n")
                printer.set(align="left")
            elif line.type == "divider":
                printer.text("-" * 42 + "\n")
            elif line.type == "qr":
                printer.qr(line.content, size=6)
            elif line.type == "barcode":
                printer.barcode(line.content, "CODE128", 64, 2, "", "")

        if req.cut:
            printer.cut()

        if req.open_drawer:
            printer.cashdraw(2)

        printer.close()
        log.info("Printed receipt: %d lines", len(req.lines))
        return {"status": "printed", "lines": str(len(req.lines))}

    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="python-escpos not installed. Run: pip install python-escpos",
        )
    except Exception as exc:
        log.error("Print failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


def main() -> None:
    """Entry point for PyInstaller executable."""
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="info")


if __name__ == "__main__":
    main()
