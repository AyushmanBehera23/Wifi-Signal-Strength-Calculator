"""GET /api/health — Agent status, version, interface, and scanner capability."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.scanner.macos import MacOSWiFiScanner
from app.schemas.api import HealthResponse

router = APIRouter()

_AGENT_VERSION = "1.0.0"
_START_TIME = datetime.now(timezone.utc)
_scanner = MacOSWiFiScanner()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    caps = _scanner.get_capabilities()
    return HealthResponse(
        status="ok" if caps.interface_available else "degraded",
        version=_AGENT_VERSION,
        agent_start_time=_START_TIME,
        scanner_available=_scanner.is_available(),
        interface_available=caps.interface_available,
        scanner_source=caps.scanner_source,
        macos_version=caps.macos_version,
    )
