#!/bin/bash
# POS Print Bridge — start script for macOS and Linux / Raspberry Pi
# Run on the HOST machine (not inside Docker).
#
# Usage:
#   chmod +x start.sh   # only needed once
#   ./start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ─── Python check ────────────────────────────────────────────────────────────

if ! command -v python3 &>/dev/null; then
    echo "ERROR: python3 not found. Install it first:"
    echo "  Raspberry Pi / Debian/Ubuntu:  sudo apt install python3 python3-pip"
    echo "  macOS:                         brew install python3"
    exit 1
fi

# ─── Linux: check 'lp' group membership for USB printer access ───────────────

if [[ "$(uname)" == "Linux" ]]; then
    if ! groups | grep -q '\blp\b'; then
        echo "WARNING: User $(whoami) is not in the 'lp' group."
        echo "         USB printer access (/dev/usb/lp*) may fail. To fix:"
        echo "         sudo usermod -a -G lp \$(whoami) && newgrp lp"
        echo ""
    fi
fi

# ─── Install / update dependencies ───────────────────────────────────────────

echo "Checking dependencies..."
python3 -m pip install -q -r requirements.txt

# ─── Start ───────────────────────────────────────────────────────────────────

echo ""
echo "============================================"
echo " POS Print Bridge running on port 9100"
echo " Platform: $(uname -s)"
echo " Keep this terminal open while using POS."
echo " Press Ctrl+C to stop."
echo "============================================"
echo ""

python3 main.py
