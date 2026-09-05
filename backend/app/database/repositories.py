"""
Database repository — async CRUD operations for scans and network observations.
Provides a clean interface between API routes and the ORM.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.models import NetworkObservationModel, ScanModel
from app.schemas.wifi import Band, DataQuality, NetworkObservation, ScanRecord, SignalQuality


def _obs_to_model(obs: NetworkObservation, scan_id: str) -> NetworkObservationModel:
    return NetworkObservationModel(
        scan_id=scan_id,
        ssid=obs.ssid,
        bssid=obs.bssid,
        frequency_mhz=obs.frequency_mhz,
        band=obs.band if isinstance(obs.band, str) else obs.band.value,
        channel=obs.channel,
        signal_dbm=obs.signal_dbm,
        signal_quality=obs.signal_quality if isinstance(obs.signal_quality, str) else obs.signal_quality.value,
        security=obs.security,
        channel_width_mhz=obs.channel_width_mhz,
        wifi_standard=obs.wifi_standard,
        first_seen_at=obs.first_seen_at,
        last_seen_at=obs.last_seen_at,
        data_quality=obs.data_quality if isinstance(obs.data_quality, str) else obs.data_quality.value,
        scanner_source=obs.scanner_source,
    )


def _model_to_obs(m: NetworkObservationModel) -> NetworkObservation:
    return NetworkObservation(
        ssid=m.ssid,
        bssid=m.bssid,
        frequency_mhz=m.frequency_mhz,
        band=m.band,
        channel=m.channel,
        signal_dbm=m.signal_dbm,
        signal_quality=m.signal_quality,
        security=m.security,
        channel_width_mhz=m.channel_width_mhz,
        wifi_standard=m.wifi_standard,
        first_seen_at=m.first_seen_at,
        last_seen_at=m.last_seen_at,
        data_quality=m.data_quality,
        scanner_source=m.scanner_source,
    )


def _scan_model_to_record(m: ScanModel, include_networks: bool = False) -> ScanRecord:
    networks = [_model_to_obs(o) for o in m.observations] if include_networks else []
    return ScanRecord(
        scan_id=m.id,
        started_at=m.started_at,
        completed_at=m.completed_at,
        interface=m.interface,
        scanner_source=m.scanner_source,
        analysis_version=m.analysis_version,
        network_count=m.network_count,
        status=m.status,
        error_code=m.error_code,
        error_message=m.error_message,
        networks=networks,
    )


async def create_scan(session: AsyncSession, scan_id: str, scanner_source: str, interface: str | None) -> ScanModel:
    scan = ScanModel(
        id=scan_id,
        scanner_source=scanner_source,
        interface=interface,
        status="running",
    )
    session.add(scan)
    await session.commit()
    await session.refresh(scan)
    return scan


async def complete_scan(
    session: AsyncSession,
    scan_id: str,
    observations: list[NetworkObservation],
) -> ScanModel | None:
    result = await session.execute(select(ScanModel).where(ScanModel.id == scan_id))
    scan = result.scalar_one_or_none()
    if scan is None:
        return None

    scan.completed_at = datetime.now(timezone.utc)
    scan.status = "complete"
    scan.network_count = len(observations)

    for obs in observations:
        session.add(_obs_to_model(obs, scan_id))

    await session.commit()
    await session.refresh(scan)
    return scan


async def fail_scan(
    session: AsyncSession, scan_id: str, error_code: str, error_message: str
) -> None:
    result = await session.execute(select(ScanModel).where(ScanModel.id == scan_id))
    scan = result.scalar_one_or_none()
    if scan:
        scan.status = "error"
        scan.error_code = error_code
        scan.error_message = error_message
        scan.completed_at = datetime.now(timezone.utc)
        await session.commit()


async def get_latest_scan(session: AsyncSession) -> ScanRecord | None:
    result = await session.execute(
        select(ScanModel)
        .where(ScanModel.status == "complete")
        .order_by(ScanModel.completed_at.desc())
        .limit(1)
        .options(selectinload(ScanModel.observations))
    )
    scan = result.scalar_one_or_none()
    return _scan_model_to_record(scan, include_networks=True) if scan else None


async def get_scan_by_id(session: AsyncSession, scan_id: str) -> ScanRecord | None:
    result = await session.execute(
        select(ScanModel)
        .where(ScanModel.id == scan_id)
        .options(selectinload(ScanModel.observations))
    )
    scan = result.scalar_one_or_none()
    return _scan_model_to_record(scan, include_networks=True) if scan else None


async def list_scans(session: AsyncSession, page: int = 1, page_size: int = 20) -> tuple[list[ScanRecord], int]:
    count_result = await session.execute(
        select(ScanModel).where(ScanModel.status == "complete")
    )
    total = len(count_result.scalars().all())

    result = await session.execute(
        select(ScanModel)
        .where(ScanModel.status == "complete")
        .order_by(ScanModel.completed_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    scans = [_scan_model_to_record(m) for m in result.scalars().all()]
    return scans, total


async def delete_all_history(session: AsyncSession) -> int:
    result = await session.execute(select(ScanModel))
    count = len(result.scalars().all())
    await session.execute(delete(ScanModel))
    await session.commit()
    return count


async def get_networks_for_bssid(
    session: AsyncSession, bssid: str
) -> list[NetworkObservation]:
    result = await session.execute(
        select(NetworkObservationModel)
        .where(NetworkObservationModel.bssid == bssid)
        .order_by(NetworkObservationModel.last_seen_at.desc())
    )
    return [_model_to_obs(m) for m in result.scalars().all()]
