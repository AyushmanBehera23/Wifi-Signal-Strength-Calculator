"""
GET /api/channels        — Channel occupancy, overlap, and estimated congestion.
GET /api/recommendations — Band-specific channel recommendations with explanations.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.analysis.congestion import compute_channel_occupancy
from app.analysis.recommendation import generate_recommendations
from app.database.database import get_session
from app.database.repositories import get_latest_scan
from app.schemas.api import ChannelAnalysisResponse
from app.schemas.wifi import Band, ChannelRecommendation

router = APIRouter()


@router.get("/channels", response_model=ChannelAnalysisResponse)
async def channel_analysis(session: AsyncSession = Depends(get_session)) -> ChannelAnalysisResponse:
    scan = await get_latest_scan(session)
    if scan is None or not scan.networks:
        return ChannelAnalysisResponse()

    networks = scan.networks
    return ChannelAnalysisResponse(
        band_24=compute_channel_occupancy(networks, Band.GHZ_2_4),
        band_5=compute_channel_occupancy(networks, Band.GHZ_5),
        band_6=compute_channel_occupancy(networks, Band.GHZ_6),
        recommendations=generate_recommendations(networks),
    )


@router.get("/recommendations", response_model=list[ChannelRecommendation])
async def recommendations(session: AsyncSession = Depends(get_session)) -> list[ChannelRecommendation]:
    scan = await get_latest_scan(session)
    if scan is None or not scan.networks:
        return []
    return generate_recommendations(scan.networks)
