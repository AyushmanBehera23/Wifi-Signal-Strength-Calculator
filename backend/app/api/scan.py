"""
POST /api/scan — Start a Wi-Fi scan.
GET  /api/scans/latest — Return the latest completed scan.
GET  /api/capabilities — Report scanner capabilities.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.ws_hub import hub
from app.database.database import get_session
from app.database.repositories import (
    complete_scan,
    create_scan,
    fail_scan,
    get_latest_scan,
)
from app.scanner.macos import MacOSWiFiScanner
from app.schemas.api import ScanStartResponse
from app.schemas.wifi import AgentCapabilities, ScanRecord

router = APIRouter()
logger = logging.getLogger(__name__)

_scanner = MacOSWiFiScanner()
_active_scan: str | None = None  # scan_id of any in-progress scan


@router.get("/capabilities", response_model=AgentCapabilities)
async def get_capabilities() -> AgentCapabilities:
    return _scanner.get_capabilities()


@router.post("/scan", response_model=ScanStartResponse)
async def start_scan(session: AsyncSession = Depends(get_session)) -> ScanStartResponse:
    global _active_scan

    # Prevent duplicate scans
    if _active_scan is not None:
        raise HTTPException(status_code=409, detail={
            "error_code": "SCAN_IN_PROGRESS",
            "message": "A scan is already running. Wait for it to complete before starting another.",
        })

    if not _scanner.is_available():
        raise HTTPException(status_code=503, detail={
            "error_code": "SCANNER_UNAVAILABLE",
            "message": "No Wi-Fi scanning source is available on this machine. "
                       "Check the Wi-Fi adapter and macOS permissions.",
        })

    scan_id = str(uuid.uuid4())
    caps = _scanner.get_capabilities()
    _active_scan = scan_id

    started_at = datetime.now(timezone.utc)
    await create_scan(session, scan_id, _scanner.source_name(), caps.interface_name)
    await hub.broadcast("scan_started", {"scanner_source": _scanner.source_name()}, scan_id=scan_id)

    # Run scan in background so the HTTP response returns immediately
    asyncio.create_task(_run_scan_background(scan_id, caps.interface_name))

    return ScanStartResponse(scan_id=scan_id, started_at=started_at)


async def _run_scan_background(scan_id: str, interface: str | None) -> None:
    global _active_scan
    try:
        await hub.broadcast("scan_progress", {"message": "Reading nearby networks from macOS…"}, scan_id=scan_id)
        loop = asyncio.get_event_loop()
        # Run blocking scan in a thread pool to avoid blocking the event loop
        observations = await loop.run_in_executor(None, _scanner.scan)

        # Persist using a fresh session (background task has no request session)
        from app.database.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            await complete_scan(session, scan_id, observations)

        await hub.broadcast(
            "scan_complete",
            {
                "network_count": len(observations),
                "message": f"Scan complete — {len(observations)} network(s) observed.",
            },
            scan_id=scan_id,
        )
        logger.info("Scan %s complete: %d networks", scan_id, len(observations))

    except Exception as exc:
        logger.exception("Background scan %s failed: %s", scan_id, exc)
        from app.database.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            await fail_scan(session, scan_id, "SCAN_FAILED", str(exc))
        await hub.broadcast(
            "scan_error",
            {"message": "Scan failed due to an unexpected error."},
            scan_id=scan_id,
            error_code="SCAN_FAILED",
        )
    finally:
        _active_scan = None


@router.get("/scans/latest", response_model=ScanRecord | None)
async def latest_scan(session: AsyncSession = Depends(get_session)) -> ScanRecord | None:
    return await get_latest_scan(session)
