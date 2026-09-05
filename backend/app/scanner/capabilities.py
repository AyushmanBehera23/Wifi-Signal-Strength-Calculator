"""
Runtime capability detection for macOS Wi-Fi scanning.

Detects which scanner source is available in priority order:
  1. airport  — richest data, legacy but widely present
  2. system_profiler — always present on macOS, less detailed
  3. None — no scanning capability detected

All detection is done at runtime by checking actual paths and
macOS version — no assumptions about command availability.
"""

from __future__ import annotations

import logging
import os
import platform
import subprocess

logger = logging.getLogger(__name__)

# Priority-ordered list of scanner sources
AIRPORT_PATH = (
    "/System/Library/PrivateFrameworks/Apple80211.framework/"
    "Versions/Current/Resources/airport"
)


def get_macos_version() -> str | None:
    """Return the macOS version string (e.g. '13.5.2') or None."""
    try:
        result = subprocess.run(
            ["sw_vers", "-productVersion"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception as exc:
        logger.debug("sw_vers failed: %s", exc)
    return None


def get_wifi_interface() -> str | None:
    """
    Return the primary Wi-Fi interface name (e.g. 'en0') or None.
    Uses networksetup to list hardware ports.
    """
    try:
        result = subprocess.run(
            ["networksetup", "-listallhardwareports"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0:
            return None
        lines = result.stdout.splitlines()
        for i, line in enumerate(lines):
            if "Wi-Fi" in line or "AirPort" in line:
                # Next lines contain 'Device: en0' etc.
                for j in range(i + 1, min(i + 4, len(lines))):
                    if lines[j].startswith("Device:"):
                        return lines[j].split(":", 1)[1].strip()
    except Exception as exc:
        logger.debug("networksetup failed: %s", exc)
    return None


def airport_available() -> bool:
    """Return True if the airport binary exists and is executable."""
    return os.path.isfile(AIRPORT_PATH) and os.access(AIRPORT_PATH, os.X_OK)


def system_profiler_available() -> bool:
    """Return True if system_profiler is available."""
    try:
        result = subprocess.run(
            ["which", "system_profiler"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.returncode == 0
    except Exception:
        return False


def detect_scanner_source() -> str:
    """
    Returns the best available scanner source identifier:
      'airport' | 'system_profiler' | 'none'
    """
    if airport_available():
        return "airport"
    if system_profiler_available():
        return "system_profiler"
    return "none"


def detect_supported_fields(source: str) -> list[str]:
    """
    Return the list of fields that the given scanner source can provide.
    Checked against known scanner output formats.
    """
    base = ["ssid", "bssid", "frequency_mhz", "band", "channel", "signal_dbm"]
    if source == "airport":
        return base + ["security", "channel_width_mhz", "wifi_standard"]
    if source == "system_profiler":
        return base + ["security"]
    return []
