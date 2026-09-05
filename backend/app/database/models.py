"""
SQLAlchemy ORM models for local SQLite storage.
Schema versioned via analysis_version column for future compatibility.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _new_uuid() -> str:
    return str(uuid.uuid4())


class ScanModel(Base):
    __tablename__ = "scan_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now_utc)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    interface: Mapped[str | None] = mapped_column(String(32), nullable=True)
    scanner_source: Mapped[str] = mapped_column(String(64), default="unknown")
    analysis_version: Mapped[str] = mapped_column(String(16), default="1.0")
    network_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    observations: Mapped[list["NetworkObservationModel"]] = relationship(
        "NetworkObservationModel",
        back_populates="scan",
        cascade="all, delete-orphan",
    )


class NetworkObservationModel(Base):
    __tablename__ = "network_observations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scan_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("scan_records.id", ondelete="CASCADE"), index=True
    )
    ssid: Mapped[str | None] = mapped_column(Text, nullable=True)
    bssid: Mapped[str | None] = mapped_column(String(17), nullable=True, index=True)
    frequency_mhz: Mapped[int | None] = mapped_column(Integer, nullable=True)
    band: Mapped[str] = mapped_column(String(16), default="Unknown")
    channel: Mapped[int | None] = mapped_column(Integer, nullable=True)
    signal_dbm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    signal_quality: Mapped[str] = mapped_column(String(16), default="Unknown")
    security: Mapped[str | None] = mapped_column(String(64), nullable=True)
    channel_width_mhz: Mapped[int | None] = mapped_column(Integer, nullable=True)
    wifi_standard: Mapped[str | None] = mapped_column(String(16), nullable=True)
    first_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    data_quality: Mapped[str] = mapped_column(String(16), default="minimal")
    scanner_source: Mapped[str | None] = mapped_column(String(64), nullable=True)

    scan: Mapped["ScanModel"] = relationship("ScanModel", back_populates="observations")
