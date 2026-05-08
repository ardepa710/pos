@echo off
:: POS Print Bridge — starts the print daemon on port 9100
:: Run this script on the host machine before using POS printing features.

title POS Print Bridge

cd /d "%~dp0"

:: Check Python is available
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

:: Install dependencies if needed
echo Checking dependencies...
python -m pip install -q -r requirements.txt

:: Start the bridge
echo.
echo ============================================
echo  POS Print Bridge running on port 9100
echo  Keep this window open while using POS.
echo  Press Ctrl+C to stop.
echo ============================================
echo.
python main.py
pause
