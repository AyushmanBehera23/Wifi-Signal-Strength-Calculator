"""
Wi-Fi Signal Analyzer — Pydantic data schemas for network observations and API responses.
All nullable fields remain None when the scanner does not report them.
No unknown measurements are converted to zero, empty strings, or inferred values.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Band(str, Enum):
    GHZ_2_4 = "2.4 GHz"
    GHZ_5 = "5 GHz"
    GHZ_6 = "6 GHz"
    UNKNOWN = "Unknown"


class SignalQuality(str, Enum):
    EXCELLENT = "Excellent"
    GOOD = "Good"
    FAIR = "Fair"
    WEAK = "Weak"
    VERY_WEAK = "Very weak"
    UNKNOWN = "Unknown"


class DataQuality(str, Enum):
    COMPLETE = "complete"
    PARTIAL = "partial"
    MINIMAL = "minimal"


class NetworkObservation(BaseModel):
    """
    Normalized representation of a single observed Wi-Fi network.
    Follows the data model in PRD Section 10.1.
    """

    ssid: Optional[str] = Field(None, description="Network name; None for hidden networks")
    bssid: Optional[str] = Field(None, description="Access point MAC address when available")
    frequency_mhz: Optional[int] = Field(None, description="Observed frequency in MHz")
    band: Band = Field(Band.UNKNOWN, description="Derived from frequency_mhz")
    channel: Optional[int] = Field(None, description="Wi-Fi channel number")
    signal_dbm: Optional[int] = Field(None, description="RSSI in dBm (negative integer)")
    signal_quality: SignalQuality = Field(SignalQuality.UNKNOWN)
    security: Optional[str] = Field(None, description="Security protocol string, e.g. WPA2/WPA3")
    channel_width_mhz: Optional[int] = Field(None, description="Channel width in MHz when available")
    wifi_standard: Optional[str] = Field(None, description="802.11 standard when available, e.g. 802.11ax")
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    data_quality: DataQuality = DataQuality.MINIMAL
    scanner_source: Optional[str] = Field(None, description="Which scanner adapter produced this observation")

    model_config = {"use_enum_values": True}


class ScanRecord(BaseModel):
    """A complete scan result — one scan may contain many NetworkObservations."""

    scan_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    interface: Optional[str] = None
    scanner_source: str
    analysis_version: str = "1.0"
    network_count: int = 0
    status: str = "pending"  # pending | running | complete | error
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    networks: list[NetworkObservation] = []


class ChannelOccupancy(BaseModel):
    """Per-channel occupancy summary for a given band."""

    channel: int
    band: Band
    frequency_mhz: Optional[int] = None
    network_count: int = 0
    avg_signal_dbm: Optional[float] = None
    max_signal_dbm: Optional[int] = None
    # Estimated congestion 0.0 (clear) – 1.0 (very congested). Labeled as estimate in UI.
    estimated_congestion: float = 0.0
    # Networks on overlapping channels (2.4 GHz only)
    overlapping_network_count: int = 0
    networks: list[str] = Field(default_factory=list, description="SSIDs on this channel")


class ChannelRecommendation(BaseModel):
    """
    Band-specific channel recommendation with full calculation explanation.
    Labeled as ESTIMATED in the UI per PRD Section 8.5.
    """

    band: Band
    recommended_channel: Optional[int] = None
    congestion_score: float = 0.0
    reasoning: str = ""
    methodology_summary: str = ""
    limitations: list[str] = Field(default_factory=list)
    analysis_version: str = "1.0"
    alternatives: list[int] = Field(default_factory=list)


class AgentCapabilities(BaseModel):
    """What the running agent can actually observe on this machine."""

    scanner_source: str
    macos_version: Optional[str] = None
    interface_name: Optional[str] = None
    interface_available: bool = False
    location_permission: Optional[str] = None  # granted | denied | unknown
    supported_fields: list[str] = Field(default_factory=list)
    supported_bands: list[Band] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
