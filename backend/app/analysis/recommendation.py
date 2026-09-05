"""
Analysis — Channel recommendations.

Recommendations are ESTIMATES based on visible-network observations.
They do not account for:
  - Hidden networks (not broadcasting SSIDs)
  - Non-Wi-Fi interference (Bluetooth, microwave ovens, baby monitors)
  - Actual airtime utilization
  - Concurrent client count on each network
  - Future channel changes by neighboring routers

Analysis version: 1.0
"""

from __future__ import annotations

from app.analysis.congestion import (
    ANALYSIS_VERSION,
    CHANNELS_24GHZ,
    CHANNELS_5GHZ,
    CHANNELS_6GHZ,
    compute_channel_occupancy,
)
from app.schemas.wifi import Band, ChannelRecommendation, NetworkObservation

# Preferred non-overlapping channels per band
_PREFERRED_24GHZ = [1, 6, 11]
_PREFERRED_5GHZ_LOW = [36, 40, 44, 48]
_PREFERRED_5GHZ_HIGH = [149, 153, 157, 161, 165]

_LIMITATIONS = [
    "Based only on networks visible from this location at scan time.",
    "Does not measure actual airtime utilization or concurrent clients.",
    "Hidden networks (not broadcasting SSIDs) are not counted.",
    "Non-Wi-Fi interference (Bluetooth, microwave, DECT) is not detected.",
    "Channel availability depends on your router's regulatory domain.",
    "This is an estimated recommendation, not a performance guarantee.",
]


def _methodology_summary(band: Band) -> str:
    if band == Band.GHZ_2_4:
        return (
            "For 2.4 GHz, only channels 1, 6, and 11 are non-overlapping in most regulatory "
            "domains. This recommendation selects the channel among these three with the "
            "lowest estimated congestion score. The score combines the count of direct "
            "networks, overlapping-channel networks (weighted 0.5×), and signal strength "
            "of nearby networks (weighted 0.3×), normalized to [0, 1]. "
            f"Analysis version: {ANALYSIS_VERSION}."
        )
    elif band == Band.GHZ_5:
        return (
            "For 5 GHz, all available channels are evaluated for estimated congestion. "
            "Channels with lower network counts and less overlap are preferred. "
            "DFS channels (52–140) require radar detection capability on your router. "
            f"Analysis version: {ANALYSIS_VERSION}."
        )
    else:
        return (
            "For 6 GHz (Wi-Fi 6E / Wi-Fi 7), all available channels are evaluated. "
            "This band is less congested in most environments as it requires newer hardware. "
            f"Analysis version: {ANALYSIS_VERSION}."
        )


def generate_recommendations(
    networks: list[NetworkObservation],
) -> list[ChannelRecommendation]:
    """
    Generate band-specific channel recommendations for all observed bands.
    Returns recommendations labeled as estimates per PRD Section 8.5.
    """
    observed_bands = {n.band for n in networks if n.band != Band.UNKNOWN}
    recommendations: list[ChannelRecommendation] = []

    for band in [Band.GHZ_2_4, Band.GHZ_5, Band.GHZ_6]:
        if band not in observed_bands and band != Band.GHZ_2_4:
            # Always provide 2.4 GHz recommendation; skip 5/6 if no networks seen
            continue

        occupancy = compute_channel_occupancy(networks, band)
        if not occupancy:
            continue

        # For 2.4 GHz: only recommend among non-overlapping channels 1, 6, 11
        if band == Band.GHZ_2_4:
            candidates = [o for o in occupancy if o.channel in _PREFERRED_24GHZ]
            if not candidates:
                candidates = occupancy  # fallback if standard channels missing
        else:
            candidates = occupancy

        # Sort by estimated_congestion ascending, then by channel number (prefer lower)
        best = sorted(candidates, key=lambda o: (o.estimated_congestion, o.channel))
        top = best[0] if best else None

        if top is None:
            recommendations.append(
                ChannelRecommendation(
                    band=band,
                    recommended_channel=None,
                    reasoning="No channels available to evaluate.",
                    methodology_summary=_methodology_summary(band),
                    limitations=_LIMITATIONS,
                    analysis_version=ANALYSIS_VERSION,
                )
            )
            continue

        # Alternatives: next 2 best options
        alternatives = [o.channel for o in best[1:3]]

        score = top.estimated_congestion
        direct = top.network_count
        overlap = top.overlapping_network_count

        if score < 0.15:
            verdict = "appears clear"
        elif score < 0.4:
            verdict = "appears lightly used"
        elif score < 0.7:
            verdict = "appears moderately used"
        else:
            verdict = "appears congested"

        reasoning = (
            f"Channel {top.channel} ({band}) {verdict} "
            f"with an estimated congestion score of {score:.2f}. "
            f"{direct} network(s) observed directly on this channel, "
            f"{overlap} network(s) on overlapping channels. "
            f"This is an estimated recommendation based on visible networks only."
        )

        recommendations.append(
            ChannelRecommendation(
                band=band,
                recommended_channel=top.channel,
                congestion_score=score,
                reasoning=reasoning,
                methodology_summary=_methodology_summary(band),
                limitations=_LIMITATIONS,
                analysis_version=ANALYSIS_VERSION,
                alternatives=alternatives,
            )
        )

    return recommendations
