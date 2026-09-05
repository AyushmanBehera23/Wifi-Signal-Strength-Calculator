"""
Analysis — Channel overlap model.

2.4 GHz model:
  Each Wi-Fi channel in the 2.4 GHz band occupies 22 MHz of spectrum.
  Channels are spaced 5 MHz apart (channel N = 2407 + N*5 MHz).
  Adjacent channels overlap when their center frequencies differ by < 22 MHz,
  i.e., when |ch_a - ch_b| < 5 for standard 20 MHz channels.
  Non-overlapping channels in most regulatory domains: 1, 6, 11.

5 GHz model:
  Channels are 20 MHz wide at minimum; bonded channels use 40/80/160 MHz.
  Overlap occurs only when actual frequency ranges intersect.

6 GHz model:
  Similar to 5 GHz. The application uses channel width when available.

This module is deterministic: same input → same overlap result.
Analysis version: 1.0
"""

from __future__ import annotations

from app.schemas.wifi import Band, NetworkObservation

# 2.4 GHz: Two channels overlap if their channel numbers differ by less than this threshold
_24GHZ_OVERLAP_THRESHOLD = 5  # channels, equivalent to 25 MHz separation for 20 MHz channels

# Standard 2.4 GHz channel center frequencies (MHz)
_24GHZ_CHANNEL_FREQ: dict[int, int] = {
    ch: 2407 + ch * 5 for ch in range(1, 14)
}
_24GHZ_CHANNEL_FREQ[14] = 2484


def channels_overlap_24ghz(ch_a: int, ch_b: int, width_a: int = 20, width_b: int = 20) -> bool:
    """
    Return True if two 2.4 GHz channels overlap.
    Uses frequency-range intersection: overlap when ranges share any MHz.

    Formula (per IEEE 802.11):
      freq_a_low  = center_a - width_a/2
      freq_a_high = center_a + width_a/2
      freq_b_low  = center_b - width_b/2
      freq_b_high = center_b + width_b/2
      overlap = freq_a_low < freq_b_high AND freq_b_low < freq_a_high
    """
    center_a = _24GHZ_CHANNEL_FREQ.get(ch_a)
    center_b = _24GHZ_CHANNEL_FREQ.get(ch_b)
    if center_a is None or center_b is None:
        return False
    a_low = center_a - width_a / 2
    a_high = center_a + width_a / 2
    b_low = center_b - width_b / 2
    b_high = center_b + width_b / 2
    return a_low < b_high and b_low < a_high


def channels_overlap_5ghz(
    ch_a: int,
    ch_b: int,
    width_a: int = 20,
    width_b: int = 20,
) -> bool:
    """
    Return True if two 5 GHz channels overlap.
    5 GHz center frequencies: 5000 + channel * 5 MHz.
    """
    center_a = 5000 + ch_a * 5
    center_b = 5000 + ch_b * 5
    a_low = center_a - width_a / 2
    a_high = center_a + width_a / 2
    b_low = center_b - width_b / 2
    b_high = center_b + width_b / 2
    return a_low < b_high and b_low < a_high


def channels_overlap_6ghz(
    ch_a: int,
    ch_b: int,
    width_a: int = 20,
    width_b: int = 20,
) -> bool:
    """6 GHz: center = 5950 + channel * 5 MHz."""
    center_a = 5950 + ch_a * 5
    center_b = 5950 + ch_b * 5
    a_low = center_a - width_a / 2
    a_high = center_a + width_a / 2
    b_low = center_b - width_b / 2
    b_high = center_b + width_b / 2
    return a_low < b_high and b_low < a_high


def count_overlapping_networks(
    target_channel: int,
    all_networks: list[NetworkObservation],
    band: Band,
) -> int:
    """
    Count how many networks in all_networks overlap with target_channel
    in the given band. The target channel itself is excluded.
    """
    count = 0
    for net in all_networks:
        if net.channel is None or net.channel == target_channel:
            continue
        if net.band != band:
            continue
        width_other = net.channel_width_mhz or 20
        if band == Band.GHZ_2_4:
            if channels_overlap_24ghz(target_channel, net.channel, 20, width_other):
                count += 1
        elif band == Band.GHZ_5:
            if channels_overlap_5ghz(target_channel, net.channel, 20, width_other):
                count += 1
        elif band == Band.GHZ_6:
            if channels_overlap_6ghz(target_channel, net.channel, 20, width_other):
                count += 1
    return count
