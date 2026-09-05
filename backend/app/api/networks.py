"""
GET /api/networks        — Filterable, paginated list of network observations from the latest scan.
GET /api/networks/{bssid} — Current and historical observations for a single BSSID.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_session
from app.database.repositories import get_latest_scan, get_networks_for_bssid
from app.schemas.api import NetworkListResponse
from app.schemas.wifi import Band, NetworkObservation, SignalQuality

router = APIRouter()


@router.get("/networks", response_model=NetworkListResponse)
async def list_networks(
    band: Optional[str] = Query(None, description="Filter by band: '2.4 GHz', '5 GHz', '6 GHz'"),
    quality: Optional[str] = Query(None, description="Filter by signal quality label"),
    search: Optional[str] = Query(None, description="Text search on SSID or BSSID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=250),
    session: AsyncSession = Depends(get_session),
) -> NetworkListResponse:
    scan = await get_latest_scan(session)
    if scan is None:
        return NetworkListResponse(networks=[], total=0, page=page, page_size=page_size)

    networks = scan.networks

    # Apply filters
    if band:
        networks = [n for n in networks if n.band == band]
    if quality:
        networks = [n for n in networks if n.signal_quality == quality]
    if search:
        q = search.lower()
        networks = [
            n for n in networks
            if (n.ssid and q in n.ssid.lower()) or (n.bssid and q in n.bssid.lower())
        ]

    total = len(networks)
    start = (page - 1) * page_size
    page_networks = networks[start : start + page_size]

    return NetworkListResponse(
        networks=page_networks,
        total=total,
        page=page,
        page_size=page_size,
        scan_id=scan.scan_id,
        scan_timestamp=scan.completed_at,
    )


@router.get("/networks/{bssid}", response_model=list[NetworkObservation])
async def network_detail(
    bssid: str,
    session: AsyncSession = Depends(get_session),
) -> list[NetworkObservation]:
    observations = await get_networks_for_bssid(session, bssid)
    if not observations:
        raise HTTPException(status_code=404, detail={
            "error_code": "NETWORK_NOT_FOUND",
            "message": f"No observations found for BSSID {bssid}.",
        })
    return observations
