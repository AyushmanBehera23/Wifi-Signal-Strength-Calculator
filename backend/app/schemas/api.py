"""
API response wrapper schemas for all REST endpoints.
Separates transport concerns from the core WiFi data model.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel, Field

from app.schemas.wifi import (
    AgentCapabilities,
    ChannelOccupancy,
    ChannelRecommendation,
    NetworkObservation,
    ScanRecord,
)

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard envelope for all successful API responses."""

    success: bool = True
    data: Optional[T] = None
    meta: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    """Standard envelope for all error responses."""

    success: bool = False
    error_code: str
    message: str
    detail: Optional[str] = None
    diagnostic_id: Optional[str] = None


class HealthResponse(BaseModel):
    status: str  # ok | degraded | unavailable
    version: str
    agent_start_time: datetime
    scanner_available: bool
    interface_available: bool
    scanner_source: Optional[str] = None
    macos_version: Optional[str] = None


class ScanStartResponse(BaseModel):
    scan_id: str
    started_at: datetime
    message: str = "Scan started"


class NetworkListResponse(BaseModel):
    networks: list[NetworkObservation]
    total: int
    page: int
    page_size: int
    scan_id: Optional[str] = None
    scan_timestamp: Optional[datetime] = None


class ChannelAnalysisResponse(BaseModel):
    band_24: list[ChannelOccupancy] = Field(default_factory=list)
    band_5: list[ChannelOccupancy] = Field(default_factory=list)
    band_6: list[ChannelOccupancy] = Field(default_factory=list)
    recommendations: list[ChannelRecommendation] = Field(default_factory=list)
    analysis_version: str = "1.0"
    estimated: bool = True
    limitation_notice: str = (
        "These scores are estimates derived from visible-network observations. "
        "They do not measure actual airtime utilization, hidden networks, "
        "non-Wi-Fi interference, or concurrent client activity."
    )


class HistoryRecord(BaseModel):
    scan_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    network_count: int
    scanner_source: str
    analysis_version: str


class HistoryResponse(BaseModel):
    records: list[HistoryRecord]
    total: int
    page: int
    page_size: int


class WebSocketEvent(BaseModel):
    """All WebSocket events share this envelope."""

    event: str  # agent_status | scan_started | scan_progress | scan_complete | scan_error
    timestamp: datetime
    scan_id: Optional[str] = None
    data: dict[str, Any] = Field(default_factory=dict)
    error_code: Optional[str] = None
