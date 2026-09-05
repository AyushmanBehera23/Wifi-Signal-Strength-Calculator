"""
macOS Wi-Fi scanner adapter.

Priority order for scanner sources (detected at runtime):
  1. airport  — richest data, widely present on macOS 10–14
  2. system_profiler — always present, less field coverage
  3. none — interface unavailable or permission denied

The scanner never raises — it returns an empty list on failure
and logs the reason for troubleshooting.
"""

from __future__ import annotations

import logging
import subprocess
from datetime import datetime, timezone

from app.scanner.base import WiFiScanner
from app.scanner.capabilities import (
    AIRPORT_PATH,
    airport_available,
    detect_scanner_source,
    detect_supported_fields,
    get_macos_version,
    get_wifi_interface,
    system_profiler_available,
)
from app.scanner.parser import parse_airport_output, parse_system_profiler_output
from app.schemas.wifi import (
    AgentCapabilities,
    Band,
    DataQuality,
    NetworkObservation,
    SignalQuality,
)

logger = logging.getLogger(__name__)

_SCAN_TIMEOUT_SECONDS = 20


def _signal_quality_from_dbm(dbm: int | None) -> SignalQuality:
    """
    Map RSSI to quality label per PRD Section 8.3.
    Thresholds are guidance, not throughput guarantees.
    """
    if dbm is None:
        return SignalQuality.UNKNOWN
    if dbm >= -50:
        return SignalQuality.EXCELLENT
    if dbm >= -60:
        return SignalQuality.GOOD
    if dbm >= -67:
        return SignalQuality.FAIR
    if dbm >= -75:
        return SignalQuality.WEAK
    return SignalQuality.VERY_WEAK


def _data_quality(obs: dict) -> DataQuality:
    """Classify how complete an observation is."""
    core_fields = ["ssid", "bssid", "frequency_mhz", "channel", "signal_dbm", "security"]
    present = sum(1 for f in core_fields if obs.get(f) is not None)
    if present >= 6:
        return DataQuality.COMPLETE
    if present >= 3:
        return DataQuality.PARTIAL
    return DataQuality.MINIMAL


def _dedup_by_bssid(raw_list: list[dict]) -> list[dict]:
    """
    De-duplicate observations within a single scan.
    If BSSID is present: dedup by BSSID.
    If BSSID is missing (e.g. system_profiler output): dedup by (ssid, channel, band).
    Rule: keep the observation with the strongest signal_dbm.
    """
    seen_bssid: dict[str, dict] = {}
    seen_key: dict[tuple, dict] = {}

    for obs in raw_list:
        bssid = obs.get("bssid")
        sig = obs.get("signal_dbm") if obs.get("signal_dbm") is not None else -999
        if bssid:
            existing = seen_bssid.get(bssid)
            if existing is None:
                seen_bssid[bssid] = obs
            else:
                existing_sig = existing.get("signal_dbm") if existing.get("signal_dbm") is not None else -999
                if sig > existing_sig:
                    seen_bssid[bssid] = obs
        else:
            key = (obs.get("ssid"), obs.get("channel"), obs.get("band"))
            existing = seen_key.get(key)
            if existing is None:
                seen_key[key] = obs
            else:
                existing_sig = existing.get("signal_dbm") if existing.get("signal_dbm") is not None else -999
                if sig > existing_sig:
                    seen_key[key] = obs

    return list(seen_bssid.values()) + list(seen_key.values())


def _to_observation(raw: dict, now: datetime) -> NetworkObservation:
    """Convert a raw parser dict to a NetworkObservation."""
    return NetworkObservation(
        ssid=raw.get("ssid"),
        bssid=raw.get("bssid"),
        frequency_mhz=raw.get("frequency_mhz"),
        band=raw.get("band", Band.UNKNOWN),
        channel=raw.get("channel"),
        signal_dbm=raw.get("signal_dbm"),
        signal_quality=_signal_quality_from_dbm(raw.get("signal_dbm")),
        security=raw.get("security"),
        channel_width_mhz=raw.get("channel_width_mhz"),
        wifi_standard=raw.get("wifi_standard"),
        first_seen_at=now,
        last_seen_at=now,
        data_quality=_data_quality(raw),
        scanner_source=raw.get("scanner_source"),
    )


class MacOSWiFiScanner(WiFiScanner):
    """
    macOS Wi-Fi scanner. Tries airport first, falls back to system_profiler.
    Never raises; returns [] on any failure.
    """

    def __init__(self) -> None:
        self._source = detect_scanner_source()
        self._interface = get_wifi_interface()
        self._macos_version = get_macos_version()

    def source_name(self) -> str:
        return self._source

    def is_available(self) -> bool:
        return self._source != "none"

    def scan(self) -> list[NetworkObservation]:
        now = datetime.now(timezone.utc)
        if self._source == "airport":
            return self._scan_airport(now)
        if self._source == "system_profiler":
            return self._scan_system_profiler(now)
        logger.warning("No scanner source available on this machine.")
        return []

    def _scan_airport(self, now: datetime) -> list[NetworkObservation]:
        """Run airport -s and parse the output."""
        try:
            result = subprocess.run(
                [AIRPORT_PATH, "-s"],
                capture_output=True,
                text=True,
                timeout=_SCAN_TIMEOUT_SECONDS,
            )
            if result.returncode != 0:
                logger.error(
                    "airport returned non-zero exit code %d: %s",
                    result.returncode,
                    result.stderr,
                )
                # Fall back to system_profiler
                if system_profiler_available():
                    logger.info("Falling back to system_profiler after airport failure.")
                    return self._scan_system_profiler(now)
                return []

            raw_list = parse_airport_output(result.stdout)
            deduped = _dedup_by_bssid(raw_list)
            return [_to_observation(r, now) for r in deduped]

        except subprocess.TimeoutExpired:
            logger.error("airport scan timed out after %ds", _SCAN_TIMEOUT_SECONDS)
            return []
        except FileNotFoundError:
            logger.error("airport binary not found at %s", AIRPORT_PATH)
            return []
        except Exception as exc:
            logger.exception("Unexpected error during airport scan: %s", exc)
            return []

    def _scan_system_profiler(self, now: datetime) -> list[NetworkObservation]:
        """Run system_profiler SPAirPortDataType -json and parse the output."""
        try:
            result = subprocess.run(
                ["system_profiler", "SPAirPortDataType", "-json"],
                capture_output=True,
                text=True,
                timeout=_SCAN_TIMEOUT_SECONDS,
            )
            if result.returncode != 0:
                logger.error(
                    "system_profiler returned error %d: %s",
                    result.returncode,
                    result.stderr,
                )
                return []

            raw_list = parse_system_profiler_output(result.stdout)
            deduped = _dedup_by_bssid(raw_list)
            return [_to_observation(r, now) for r in deduped]

        except subprocess.TimeoutExpired:
            logger.error("system_profiler scan timed out after %ds", _SCAN_TIMEOUT_SECONDS)
            return []
        except Exception as exc:
            logger.exception("Unexpected error during system_profiler scan: %s", exc)
            return []

    def get_capabilities(self) -> AgentCapabilities:
        supported_fields = detect_supported_fields(self._source)
        bands: list[Band] = [Band.GHZ_2_4, Band.GHZ_5]
        if self._source == "airport":
            bands.append(Band.GHZ_6)

        notes: list[str] = []
        if self._source == "airport":
            notes.append(
                "Using airport utility. This may require Location Services access on macOS 14+."
            )
        elif self._source == "system_profiler":
            notes.append(
                "Using system_profiler. BSSID and Wi-Fi standard fields are not available from this source."
            )
        else:
            notes.append("No Wi-Fi scanning source detected. Check adapter and permissions.")

        if self._macos_version:
            try:
                major = int(self._macos_version.split(".")[0])
                if major >= 14:
                    notes.append(
                        "macOS 14+ may require Location Services permission for full scan data."
                    )
            except ValueError:
                pass

        return AgentCapabilities(
            scanner_source=self._source,
            macos_version=self._macos_version,
            interface_name=self._interface,
            interface_available=self._interface is not None,
            supported_fields=supported_fields,
            supported_bands=bands,
            notes=notes,
        )
