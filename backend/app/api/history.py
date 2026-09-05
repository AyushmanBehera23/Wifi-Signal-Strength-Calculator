"""
GET    /api/history — Paginated scan history.
DELETE /api/history — Delete all local scan history after explicit confirmation.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_session
from app.database.repositories import delete_all_history, list_scans
from app.schemas.api import HistoryRecord, HistoryResponse

router = APIRouter()


@router.get("/history", response_model=HistoryResponse)
async def get_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> HistoryResponse:
    records, total = await list_scans(session, page=page, page_size=page_size)
    return HistoryResponse(
        records=[
            HistoryRecord(
                scan_id=r.scan_id,
                started_at=r.started_at,
                completed_at=r.completed_at,
                network_count=r.network_count,
                scanner_source=r.scanner_source,
                analysis_version=r.analysis_version,
            )
            for r in records
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.delete("/history")
async def delete_history(
    confirm: bool = Query(False, description="Must be true to confirm deletion"),
    session: AsyncSession = Depends(get_session),
) -> dict:
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "CONFIRMATION_REQUIRED",
                "message": "Pass ?confirm=true to delete all scan history. This action cannot be undone.",
            },
        )
    count = await delete_all_history(session)
    return {"deleted_scan_count": count, "message": f"Deleted {count} scan record(s) from local history."}
