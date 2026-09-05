"""
FastAPI application entrypoint.
Binds to 127.0.0.1:8000 by default for local-only access.
CORS is restricted to the local Vite dev server origin.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api import channels, health, history, networks, scan
from app.api.ws_hub import hub
from app.database.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Wi-Fi Signal Analyzer agent starting…")
    await init_db()
    logger.info("SQLite database initialized.")
    yield
    logger.info("Agent shutting down.")


app = FastAPI(
    title="Wi-Fi Signal Analyzer Agent",
    description=(
        "Local macOS agent that scans nearby Wi-Fi networks and exposes "
        "normalized results via REST and WebSocket. Binds to 127.0.0.1 only."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: allow only the local Vite dev server (and optionally a built frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)

# Mount API routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(scan.router, prefix="/api", tags=["scan"])
app.include_router(networks.router, prefix="/api", tags=["networks"])
app.include_router(channels.router, prefix="/api", tags=["channels"])
app.include_router(history.router, prefix="/api", tags=["history"])


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    """
    WebSocket endpoint for real-time scan events.
    Events: agent_status | scan_started | scan_progress | scan_complete | scan_error
    """
    await hub.connect(ws)
    try:
        # Send initial agent_status event on connect
        from app.scanner.macos import MacOSWiFiScanner
        scanner = MacOSWiFiScanner()
        caps = scanner.get_capabilities()
        await hub.broadcast(
            "agent_status",
            {
                "scanner_available": scanner.is_available(),
                "interface_available": caps.interface_available,
                "scanner_source": caps.scanner_source,
            },
        )
        # Keep connection alive — we only send from the server
        while True:
            await ws.receive_text()  # Ignore client messages; just keep alive
    except WebSocketDisconnect:
        pass
    finally:
        await hub.disconnect(ws)


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info",
    )
