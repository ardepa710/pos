#!/bin/bash
# Build Print Bridge executable for current platform
# Usage: bash build.sh [win|mac|linux]

set -e

echo "Building POS Print Bridge..."
pip install pyinstaller python-escpos

pyinstaller build.spec --clean --noconfirm
echo "Build complete: dist/pos-print-bridge"
