"""
Raw scanner output parsers for macOS Wi-Fi data sources.

Each parser takes a raw string (or dict) from its scanner source
and returns a list of partially-populated NetworkObservation dicts.
Normalization into full NetworkObservation objects is done in macos.py.

Invariants:
  - Missing or malformed fields become None — never zero or empty string.
  - Duplicate BSSIDs within one scan are kept here; deduplication happens upstream.
  - All parsers are deterministic: same input → same output.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# airport parser
# ──────────────────────────────────────────────────────────────────────────────

# airport -s output columns (may vary by macOS version):
# SSID  BSSID  RSSI  CHANNEL  HT  CC  SECURITY (auth/unicast/group)
_AIRPORT_HEADER_RE = re.compile(
    r"\s*SSID\s+BSSID\s+RSSI\s+CHANNEL\s+HT\s+CC\s+SECURITY", re.IGNORECASE
)

_CHANNEL_RE = re.compile(r"^(\d+)(?:,(\d+))?(?:\+|-)?$")
"""
Examples:
  '6'        → channel=6, width=None
  '36,80'    → channel=36, width=80
  '6,20'     → channel=6, width=20
  '11+'      → channel=11 (extension above)
"""


def _parse_channel_field(raw: str) -> tuple[int | None, int | None]:
    """Return (channel, width_mhz) from an airport channel field."""
    if not raw:
        return None, None
    m = _CHANNEL_RE.match(raw.strip())
    if not m:
        return None, None
    channel = int(m.group(1))
    width = int(m.group(2)) if m.group(2) else None
    return channel, width


def _frequency_from_channel(channel: int | None) -> int | None:
    """Derive frequency in MHz from channel number (best-effort)."""
    if channel is None:
        return None
    if 1 <= channel <= 14:
        if channel == 14:
            return 2484
        return 2407 + channel * 5
    if 36 <= channel <= 177:
        return 5000 + channel * 5
    if 1 <= channel <= 233 and channel > 177:  # 6 GHz
        return 5950 + channel * 5
    return None


def _band_from_frequency(freq_mhz: int | None) -> str:
    """Classify frequency to band string."""
    if freq_mhz is None:
        return "Unknown"
    if 2400 <= freq_mhz <= 2500:
        return "2.4 GHz"
    if 4900 <= freq_mhz <= 5900:
        return "5 GHz"
    if 5925 <= freq_mhz <= 7125:
        return "6 GHz"
    return "Unknown"


def _parse_security_airport(raw: str) -> str | None:
    """
    Convert airport security column like 'WPA2(PSK/AES/AES)' to
    a clean string like 'WPA2'.
    """
    if not raw or raw.strip() in ("NONE", "--", ""):
        return "Open"
    # Strip parenthetical detail
    clean = re.sub(r"\(.*?\)", "", raw).strip()
    return clean or None


def parse_airport_output(raw: str) -> list[dict[str, Any]]:
    """
    Parse the tabular output of `airport -s` into a list of dicts.
    Returns an empty list on any parse failure.
    """
    results: list[dict[str, Any]] = []
    lines = raw.splitlines()

    # Find header line
    header_idx = None
    for i, line in enumerate(lines):
        if _AIRPORT_HEADER_RE.search(line):
            header_idx = i
            break

    if header_idx is None:
        logger.warning("airport output: could not find header row")
        return results

    header_line = lines[header_idx]
    # Determine column start positions from header
    col_positions: dict[str, int] = {}
    for col in ("SSID", "BSSID", "RSSI", "CHANNEL", "HT", "CC", "SECURITY"):
        idx = header_line.upper().find(col)
        if idx >= 0:
            col_positions[col] = idx

    if not col_positions:
        logger.warning("airport output: header columns not found")
        return results

    sorted_cols = sorted(col_positions.items(), key=lambda x: x[1])
    # The first column (SSID) can extend to the left margin
    if sorted_cols and sorted_cols[0][0] == "SSID":
        sorted_cols[0] = ("SSID", 0)

    for line in lines[header_idx + 1 :]:
        if not line.strip():
            continue
        try:
            fields: dict[str, str] = {}
            for i, (col_name, start) in enumerate(sorted_cols):
                end = sorted_cols[i + 1][1] if i + 1 < len(sorted_cols) else None
                raw_val = line[start:end].strip() if end else line[start:].strip()
                fields[col_name] = raw_val

            ssid_raw = fields.get("SSID", "").strip()
            bssid_raw = fields.get("BSSID", "").strip()
            rssi_raw = fields.get("RSSI", "").strip()
            channel_raw = fields.get("CHANNEL", "").strip()
            security_raw = fields.get("SECURITY", "").strip()
            ht_raw = fields.get("HT", "").strip()

            # Parse RSSI
            try:
                signal_dbm = int(rssi_raw) if rssi_raw else None
            except ValueError:
                signal_dbm = None

            # Parse channel and width
            channel, width = _parse_channel_field(channel_raw)
            freq = _frequency_from_channel(channel)
            band = _band_from_frequency(freq)
            security = _parse_security_airport(security_raw)

            # Derive Wi-Fi standard from HT field (best-effort)
            wifi_standard: str | None = None
            if ht_raw == "Y":
                wifi_standard = "802.11n"  # HT = High Throughput
            elif ht_raw == "N" and freq and freq < 2500:
                wifi_standard = "802.11g"

            results.append(
                {
                    "ssid": ssid_raw if ssid_raw else None,
                    "bssid": bssid_raw if bssid_raw else None,
                    "frequency_mhz": freq,
                    "band": band,
                    "channel": channel,
                    "signal_dbm": signal_dbm,
                    "security": security,
                    "channel_width_mhz": width,
                    "wifi_standard": wifi_standard,
                    "scanner_source": "airport",
                }
            )
        except Exception as exc:
            logger.debug("airport parser: skipping malformed line %r: %s", line, exc)
            continue

    return results


# ──────────────────────────────────────────────────────────────────────────────
# system_profiler parser
# ──────────────────────────────────────────────────────────────────────────────


def _parse_phymode(raw: str | None) -> str | None:
    """Extract standard string from system_profiler phymode like '802.11a/n/ac/ax'."""
    if not raw:
        return None
    raw_lower = raw.lower()
    if "be" in raw_lower:
        return "802.11be"
    if "ax" in raw_lower:
        return "802.11ax"
    if "ac" in raw_lower:
        return "802.11ac"
    if "n" in raw_lower:
        return "802.11n"
    if "g" in raw_lower:
        return "802.11g"
    if "a" in raw_lower:
        return "802.11a"
    if "b" in raw_lower:
        return "802.11b"
    return raw


def parse_system_profiler_output(raw_json: str) -> list[dict[str, Any]]:
    """
    Parse JSON output of `system_profiler SPAirPortDataType -json`.
    Supports both legacy top-level structure and macOS 13+ interface-nested structure.
    Returns an empty list on parse failure.
    """
    results: list[dict[str, Any]] = []
    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        logger.warning("system_profiler: JSON parse error: %s", exc)
        return results

    try:
        sp_airport = data.get("SPAirPortDataType", [])

        def _extract_net(net: dict[str, Any]) -> None:
            if not isinstance(net, dict):
                return
            raw_name = net.get("_name")
            ssid: str | None = None
            if raw_name:
                ssid = str(raw_name).strip()
                if ssid == "<redacted>":
                    ssid = "<Redacted by macOS>"

            bssid: str | None = net.get("spairport_network_bssid") or None

            channel_str = net.get("spairport_network_channel") or ""
            channel, width, freq, band = _parse_system_profiler_channel(str(channel_str))

            signal_dbm = _parse_sp_rssi(net)

            security_raw = net.get("spairport_security_mode") or ""
            security = _parse_sp_security(str(security_raw)) if security_raw else None

            phymode_raw = net.get("spairport_network_phymode") or ""
            wifi_standard = _parse_phymode(str(phymode_raw)) if phymode_raw else None

            results.append(
                {
                    "ssid": ssid,
                    "bssid": bssid,
                    "frequency_mhz": freq,
                    "band": band,
                    "channel": channel,
                    "signal_dbm": signal_dbm,
                    "security": security,
                    "channel_width_mhz": width,
                    "wifi_standard": wifi_standard,
                    "scanner_source": "system_profiler",
                }
            )

        for adapter in sp_airport:
            if not isinstance(adapter, dict):
                continue
            # Top-level adapter entries
            curr = adapter.get("spairport_current_network_information")
            if isinstance(curr, dict):
                _extract_net(curr)
            others = adapter.get("spairport_airport_other_local_wireless_networks", [])
            if isinstance(others, list):
                for net in others:
                    _extract_net(net)

            # Interfaces level (macOS 13+)
            interfaces = adapter.get("spairport_airport_interfaces", [])
            if isinstance(interfaces, list):
                for iface in interfaces:
                    if not isinstance(iface, dict):
                        continue
                    iface_curr = iface.get("spairport_current_network_information")
                    if isinstance(iface_curr, dict):
                        _extract_net(iface_curr)
                    iface_others = iface.get("spairport_airport_other_local_wireless_networks", [])
                    if isinstance(iface_others, list):
                        for net in iface_others:
                            _extract_net(net)

    except Exception as exc:
        logger.warning("system_profiler parser: unexpected error: %s", exc)

    return results


def _parse_system_profiler_channel(
    channel_str: str,
) -> tuple[int | None, int | None, int | None, str]:
    """
    Parse channel strings like:
      '6 (2GHz, 20MHz)'  → (6, 20, 2437, '2.4 GHz')
      '36 (5GHz, 80MHz)' → (36, 80, 5180, '5 GHz')
      '6'                → (6, None, 2437, '2.4 GHz')
    """
    if not channel_str:
        return None, None, None, "Unknown"

    m = re.match(r"(\d+)(?:\s*\((\d+)GHz,\s*(\d+)MHz\))?", channel_str.strip())
    if not m:
        return None, None, None, "Unknown"

    channel = int(m.group(1))
    width = int(m.group(3)) if m.group(3) else None
    freq = _frequency_from_channel(channel)
    band = _band_from_frequency(freq)
    return channel, width, freq, band


def _parse_sp_rssi(net: dict[str, Any]) -> int | None:
    """Extract RSSI from strings like '-65 dBm / -90 dBm'."""
    raw = net.get("spairport_signal_noise") or net.get("spairport_network_signal_noise") or ""
    m = re.search(r"(-\d+)\s*dBm", str(raw))
    if m:
        return int(m.group(1))
    return None


def _parse_sp_security(raw: str) -> str | None:
    """Map system_profiler security mode keys to human-readable strings."""
    if not raw:
        return "Open"
    mapping = {
        "spairport_security_mode_none": "Open",
        "spairport_security_mode_wep": "WEP",
        "spairport_security_mode_wpa_personal": "WPA",
        "spairport_security_mode_wpa2_personal": "WPA2",
        "spairport_security_mode_wpa2_personal_mixed": "WPA2",
        "spairport_security_mode_wpa3_personal": "WPA3",
        "pairport_security_mode_wpa3_transition": "WPA3/WPA2",
        "spairport_security_mode_wpa2_enterprise": "WPA2-Enterprise",
        "spairport_security_mode_wpa3_enterprise": "WPA3-Enterprise",
    }
    low = raw.lower().strip()
    if low in mapping:
        return mapping[low]
    clean = re.sub(r"^(sp|p)?airport_security_mode_", "", low)
    clean = clean.replace("_", " ").title()
    return clean or None

