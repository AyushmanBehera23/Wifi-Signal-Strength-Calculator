@echo off
REM start_agent.bat — Start the Wi-Fi Signal Analyzer local agent on Windows
setlocal enabledelayedexpansion

echo ============================================
echo    Wi-Fi Signal Analyzer - Windows Agent    
echo ============================================
echo.

set PORT=%1
if "%PORT%"=="" set PORT=8000

REM Check Python installation
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] Python was not found in PATH.
    echo     Please install Python 3.11+ from https://python.org and make sure to check "Add python.exe to PATH".
    pause
    exit /b 1
)

REM Setup virtual environment if not present
if not exist ".venv" (
    echo [*] Creating virtual environment (.venv)...
    python -m venv .venv
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Install dependencies
echo [*] Checking dependencies...
pip install -r requirements.txt --quiet

REM Start agent
echo.
echo [OK] Starting local agent on http://127.0.0.1:%PORT%
echo [OK] Press Ctrl+C to stop.
echo.
uvicorn app.main:app --host 127.0.0.1 --port %PORT% --reload
