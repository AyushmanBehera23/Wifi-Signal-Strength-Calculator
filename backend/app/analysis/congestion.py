"""
Analysis — Estimated channel congestion scoring.

IMPORTANT: These scores are ESTIMATES derived from visible-network observations.
They do NOT measure actual airtime utilization, hidden networks,
non-Wi-Fi interference, or concurrent client activity.

Congestion Score Formula (Analysis Version 1.0):
================================================
For each channel C in a given band:

  direct_count     = number of networks ON channel C
  overlap_count    = number of networks on OVERLAPPING channels (weighted 0.5)
  signal_penalty   = sum of signal_weights for networks on C or overlapping
                     where signal_weight = max(0, (dbm + 40) / 40) clamped [0,1]
                     (stronger-signal networks contribute more to congestion)

  raw_score = direct_count + 0.5 * overlap_count + 0.3 * signal_penalty
  congestion = clamp(raw_score / MAX_SCORE, 0.0, 1.0)

  MAX_SCORE = 10 (empirical normalization constant; represents a heavily loaded channel)

The score is deterministic for the same set of observations.
Analysis version is stored with every recommendation for future comparisons.
"""

from __future__ import annotations

from app.analysis.overlap import count_overlapping_networks
from app.schemas.wifi import Band, ChannelOccupancy, NetworkObservation

ANALYSIS_VERSION = "1.0"
MAX_SCORE = 10.0  # normalization constant

# Channels to evaluate per band (common regulatory domain channels)
CHANNELS_24GHZ = list(range(1, 12))  # 1–11 (US/EU)
CHANNELS_5GHZ = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120,
                 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165]
CHANNELS_6GHZ = [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49, 53, 57, 61,
                 65, 69, 73, 77, 81, 85, 89, 93]


def _signal_weight(dbm: int | None) -> float:
    """
    Convert RSSI to a [0,1] weight for congestion scoring.
    Stronger signals (closer to 0 dBm) contribute more to perceived congestion.
    Signal at -40 dBm or above → weight 1.0
    Signal at -80 dBm or below → weight 0.0
    """
    if dbm is None:
        return 0.1  # assume minimal contribution for unknown signal
    # Linear interpolation between -80 dBm (0.0) and -40 dBm (1.0)
    return max(0.0, min(1.0, (dbm + 80) / 40.0))


def _compute_channel_score(
    channel: int,
    band: Band,
    all_networks: list[NetworkObservation],
) -> tuple[float, int, int, float]:
    """
    Returns (congestion_score, direct_count, overlap_count, avg_signal).
    """
    direct = [n for n in all_networks if n.channel == channel and n.band == band]
    direct_count = len(direct)

    # Networks on overlapping channels (excluding direct)
    overlap_count = count_overlapping_networks(channel, all_networks, band)

    # Signal penalty from direct networks
    signal_penalty = sum(_signal_weight(n.signal_dbm) for n in direct)

    raw = direct_count + 0.5 * overlap_count + 0.3 * signal_penalty
    congestion = min(1.0, raw / MAX_SCORE)

    # Average signal of direct networks
    signals = [n.signal_dbm for n in direct if n.signal_dbm is not None]
    avg_signal = sum(signals) / len(signals) if signals else None
    max_signal = max(signals) if signals else None

    return congestion, direct_count, overlap_count, avg_signal, max_signal


def compute_channel_occupancy(
    networks: list[NetworkObservation],
    band: Band,
) -> list[ChannelOccupancy]:
    """
    Compute ChannelOccupancy for every relevant channel in a given band.
    Only includes channels that have at least one visible network OR
    are the standard non-overlapping channels (for recommendation purposes).
    """
    channel_map = CHANNELS_24GHZ if band == Band.GHZ_2_4 else (
        CHANNELS_5GHZ if band == Band.GHZ_5 else CHANNELS_6GHZ
    )

    # Collect channels that have networks (may include channels not in our standard list)
    observed_channels = {
        n.channel for n in networks if n.band == band and n.channel is not None
    }
    all_channels = sorted(set(channel_map) | observed_channels)

    results: list[ChannelOccupancy] = []
    for ch in all_channels:
        congestion, direct_count, overlap_count, avg_sig, max_sig = _compute_channel_score(
            ch, band, networks
        )
        ssids = [n.ssid or "(hidden)" for n in networks if n.channel == ch and n.band == band]

        # Derive frequency for this channel
        if band == Band.GHZ_2_4:
            freq = 2407 + ch * 5 if ch != 14 else 2484
        elif band == Band.GHZ_5:
            freq = 5000 + ch * 5
        else:
            freq = 5950 + ch * 5

        results.append(
            ChannelOccupancy(
                channel=ch,
                band=band,
                frequency_mhz=freq,
                network_count=direct_count,
                avg_signal_dbm=round(avg_sig, 1) if avg_sig is not None else None,
                max_signal_dbm=max_sig,
                estimated_congestion=round(congestion, 3),
                overlapping_network_count=overlap_count,
                networks=ssids,
            )
        )

    return results
