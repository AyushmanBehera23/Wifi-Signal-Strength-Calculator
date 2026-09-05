"""
Analysis — Signal quality labeling.
Maps RSSI (dBm) to text labels per PRD Section 8.3.
These thresholds are guidance, not a guarantee of throughput or latency.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.schemas.wifi import SignalQuality


@dataclass(frozen=True)
class SignalBand:
    label: SignalQuality
    min_dbm: int  # inclusive lower bound (more negative = weaker)
    max_dbm: int  # inclusive upper bound
    guidance: str


# Bands ordered from best to worst signal
SIGNAL_BANDS: tuple[SignalBand, ...] = (
    SignalBand(
        label=SignalQuality.EXCELLENT,
        min_dbm=-50,
        max_dbm=0,
        guidance="Strong signal at the current location.",
    ),
    SignalBand(
        label=SignalQuality.GOOD,
        min_dbm=-60,
        max_dbm=-51,
        guidance="Generally suitable for common use.",
    ),
    SignalBand(
        label=SignalQuality.FAIR,
        min_dbm=-67,
        max_dbm=-61,
        guidance="May be adequate but has less margin.",
    ),
    SignalBand(
        label=SignalQuality.WEAK,
        min_dbm=-75,
        max_dbm=-68,
        guidance="Performance may vary with distance and interference.",
    ),
    SignalBand(
        label=SignalQuality.VERY_WEAK,
        min_dbm=-120,
        max_dbm=-76,
        guidance="Connection quality may be unreliable.",
    ),
)


def label_from_dbm(dbm: int | None) -> SignalQuality:
    """Return the SignalQuality label for a given RSSI value."""
    if dbm is None:
        return SignalQuality.UNKNOWN
    for band in SIGNAL_BANDS:
        if band.min_dbm <= dbm <= band.max_dbm:
            return band.label
    return SignalQuality.VERY_WEAK


def guidance_from_dbm(dbm: int | None) -> str:
    """Return the human-readable guidance string for a given RSSI value."""
    if dbm is None:
        return "Signal strength not reported."
    for band in SIGNAL_BANDS:
        if band.min_dbm <= dbm <= band.max_dbm:
            return band.guidance
    return SIGNAL_BANDS[-1].guidance


def signal_band_legend() -> list[dict]:
    """Return the full legend for UI display."""
    return [
        {
            "label": b.label,
            "range": f"{b.min_dbm} to {b.max_dbm} dBm",
            "guidance": b.guidance,
        }
        for b in SIGNAL_BANDS
    ]
