# Analysis Methodology

## Overview

The Wi-Fi Signal Analyzer produces **estimates** from visible-network observations. These estimates are clearly labeled in the UI and must not be interpreted as actual airtime utilization measurements.

**Analysis Version:** 1.0

---

## Signal Quality Thresholds

RSSI (Received Signal Strength Indicator) is measured in dBm. The following thresholds apply:

| RSSI | Label | Guidance |
|------|-------|----------|
| ≥ −50 dBm | Excellent | Strong signal at the current location. |
| −51 to −60 dBm | Good | Generally suitable for common use. |
| −61 to −67 dBm | Fair | May be adequate but has less margin. |
| −68 to −75 dBm | Weak | Performance may vary with distance and interference. |
| < −75 dBm | Very weak | Connection quality may be unreliable. |

These thresholds are guidance, not a guarantee of throughput or latency. RSSI is measured at the scan location and time only.

---

## Channel Overlap Model

### 2.4 GHz

Two channels overlap when their frequency ranges intersect:

```
center_a = 2407 + channel_a × 5  (MHz)
center_b = 2407 + channel_b × 5  (MHz)

a_low  = center_a − width_a / 2
a_high = center_a + width_a / 2
b_low  = center_b − width_b / 2
b_high = center_b + width_b / 2

overlap = (a_low < b_high) AND (b_low < a_high)
```

Default channel width: 20 MHz. Standard non-overlapping channels in most regulatory domains: 1, 6, 11.

### 5 GHz

Center frequencies: `5000 + channel × 5 MHz`. Same overlap formula. Channel width from scan data when available.

### 6 GHz

Center frequencies: `5950 + channel × 5 MHz`. Same formula.

---

## Estimated Congestion Score

**Formula (Analysis Version 1.0):**

```
direct_count   = number of networks observed ON channel C
overlap_count  = number of networks on OVERLAPPING channels
signal_penalty = Σ signal_weight(n) for networks on C
                 where signal_weight = clamp((dbm + 80) / 40, 0, 1)

raw_score  = direct_count + 0.5 × overlap_count + 0.3 × signal_penalty
congestion = clamp(raw_score / MAX_SCORE, 0, 1)
```

- `MAX_SCORE = 10` (empirical normalization constant)
- Signal weight: −40 dBm → 1.0, −80 dBm → 0.0 (stronger signals contribute more to perceived congestion)
- Score is deterministic: same observations → same score

---

## Channel Recommendations

For 2.4 GHz: only channels 1, 6, and 11 are considered (non-overlapping in most regulatory domains).

For 5 GHz and 6 GHz: all detected channels are evaluated.

The recommended channel is the one with the lowest estimated congestion score. Ties are broken by channel number (lower preferred).

**Limitations:**
- Based only on networks visible from the scan location at scan time
- Does not measure actual airtime utilization or concurrent clients
- Hidden networks (not broadcasting SSIDs) are not counted
- Non-Wi-Fi interference (Bluetooth, microwave, DECT) is not detected
- Channel availability depends on your router's regulatory domain
- This is an estimated recommendation, not a performance guarantee

---

## Data Quality

Each network observation is classified as:

| Quality | Criteria |
|---------|----------|
| `complete` | All 6 core fields (SSID, BSSID, frequency, channel, signal, security) present |
| `partial` | 3–5 core fields present |
| `minimal` | Fewer than 3 core fields present |

Missing fields are preserved as `null` — never converted to zero or empty string.

---

## Analysis Version

Every recommendation and congestion score carries an `analysis_version` field. This allows future changes to the formula to be identified when comparing historical results in the scan history view.
