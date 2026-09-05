"""WebSocket connection hub for real-time scan event streaming."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionHub:
    """Manages all active WebSocket connections and broadcasts events."""

    def __init__(self) -> None:
        self._connections: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._connections.append(ws)
        logger.info("WebSocket client connected. Total: %d", len(self._connections))

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._connections = [c for c in self._connections if c is not ws]
        logger.info("WebSocket client disconnected. Total: %d", len(self._connections))

    async def broadcast(self, event: str, data: dict, scan_id: str | None = None, error_code: str | None = None) -> None:
        payload = {
            "event": event,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "scan_id": scan_id,
            "data": data,
            "error_code": error_code,
        }
        msg = json.dumps(payload, default=str)
        dead: list[WebSocket] = []
        for ws in list(self._connections):
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)


# Singleton hub shared across all routes
hub = ConnectionHub()
