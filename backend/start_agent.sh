#!/usr/bin/env bash
# start_agent.sh — Start the Wi-Fi Signal Analyzer local agent
# Usage: ./start_agent.sh [port]   default port: 8000

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"
PORT="${1:-8000}"

echo "╔══════════════════════════════════════════╗"
echo "║   Wi-Fi Signal Analyzer — Local Agent    ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Python version check ───────────────────────────────────────────────────────
PYTHON_BIN="python3"
if ! command -v "$PYTHON_BIN" &>/dev/null; then
    echo "❌  Python 3 not found. Install Python 3.11+ from https://python.org"
    exit 1
fi

PY_VERSION=$("$PYTHON_BIN" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)

if [ "$PY_MAJOR" -lt 3 ] || ([ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 11 ]); then
    echo "❌  Python 3.11+ is required. You have Python $PY_VERSION."
    echo "    Install from https://python.org or via Homebrew: brew install python@3.11"
    exit 1
fi

echo "✓  Python $PY_VERSION detected"

# ── PyO3 / pydantic-core ABI3 compatibility for Python 3.13+ ──────────────────
# pydantic-core uses PyO3 which may lag behind the very latest CPython releases.
# PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1 allows it to build using the stable ABI,
# which is fully supported and safe for production use.
if [ "$PY_MINOR" -ge 13 ]; then
    echo "→  Python $PY_VERSION detected — enabling PyO3 ABI3 forward compatibility"
    export PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1
fi

# ── Stale venv detection ───────────────────────────────────────────────────────
# Remove the venv if it was created by a different Python version to avoid
# subtle incompatibilities when the user upgrades Python.
if [ -d "$VENV_DIR" ]; then
    VENV_PY_VERSION=$("$VENV_DIR/bin/python3" -c \
        "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" \
        2>/dev/null || echo "unknown")
    if [ "$VENV_PY_VERSION" != "$PY_VERSION" ]; then
        echo "→  Removing stale venv (was Python $VENV_PY_VERSION, now $PY_VERSION)…"
        rm -rf "$VENV_DIR"
    fi
fi

# ── Create virtual environment ─────────────────────────────────────────────────
if [ ! -d "$VENV_DIR" ]; then
    echo "→  Creating virtual environment…"
    "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

# ── Activate and install ───────────────────────────────────────────────────────
source "$VENV_DIR/bin/activate"

echo "→  Installing / updating dependencies…"
pip install --quiet --upgrade pip
pip install --quiet -r "$SCRIPT_DIR/requirements.txt"

echo ""
echo "✓  Dependencies installed"
echo "→  Starting agent on http://127.0.0.1:$PORT"
echo "→  Open http://localhost:5173 in your browser after starting the frontend."
echo "   Press Ctrl+C to stop the agent."
echo ""

cd "$SCRIPT_DIR"
exec uvicorn app.main:app --host 127.0.0.1 --port "$PORT" --log-level info
