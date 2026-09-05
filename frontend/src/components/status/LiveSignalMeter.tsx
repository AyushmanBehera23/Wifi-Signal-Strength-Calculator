import { useMemo } from "react";
import type { NetworkObservation } from "../../types/wifi";

interface LiveSignalMeterProps {
  networks: NetworkObservation[];
  history: Array<{ timestamp: string; readings: Record<string, number> }>;
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  intervalSec: number;
  onChangeInterval: (sec: number) => void;
}

export function LiveSignalMeter({
  networks,
  history,
  isMonitoring,
  onToggleMonitoring,
  intervalSec,
  onChangeInterval,
}: LiveSignalMeterProps) {
  // Find connected or strongest network
  const activeNet = useMemo(() => {
    if (!networks.length) return null;
    return networks.reduce((strongest, n) => {
      if (n.signal_dbm == null) return strongest;
      if (!strongest || strongest.signal_dbm == null) return n;
      return n.signal_dbm > strongest.signal_dbm ? n : strongest;
    }, networks[0]);
  }, [networks]);

  // Compute live signal delta (change from previous scan)
  const deltaInfo = useMemo(() => {
    if (!activeNet || history.length < 2) return null;
    const ssid = activeNet.ssid || "Wi-Fi Network";
    const current = history[history.length - 1]?.readings[ssid];
    const previous = history[history.length - 2]?.readings[ssid];
    if (current == null || previous == null) return null;
    const diff = current - previous;
    return {
      diff,
      formatted: diff > 0 ? `▲ +${diff} dBm` : diff < 0 ? `▼ ${diff} dBm` : `▶ 0 dBm (Stable)`,
      color: diff > 0 ? "#22c55e" : diff < 0 ? "#ef4444" : "#94a3b8",
    };
  }, [activeNet, history]);

  // Calculate session stats for active network
  const stats = useMemo(() => {
    if (!activeNet || !history.length) return null;
    const ssid = activeNet.ssid || "Wi-Fi Network";
    const values: number[] = [];
    for (const h of history) {
      if (h.readings[ssid] != null) {
        values.push(h.readings[ssid]);
      }
    }
    if (!values.length) return null;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const range = max - min;
    const stability = range <= 3 ? "Highly Stable" : range <= 8 ? "Moderate Fluctuation" : "Unstable Signal";
    return { max, min, avg, stability, sampleCount: values.length };
  }, [activeNet, history]);

  const rssi = activeNet?.signal_dbm ?? null;
  // Convert RSSI (-100 to -30 dBm) to Percentage (0 to 100%)
  const percentage = rssi != null ? Math.min(100, Math.max(0, Math.round(((rssi + 100) / 70) * 100))) : 0;

  const qualityColor =
    rssi != null && rssi >= -50
      ? "#22c55e"
      : rssi != null && rssi >= -60
      ? "#86efac"
      : rssi != null && rssi >= -67
      ? "#facc15"
      : rssi != null && rssi >= -75
      ? "#f97316"
      : "#ef4444";

  return (
    <div className="card" style={{ position: "relative", overflow: "hidden" }}>
      {/* Live Badge Glow Bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: isMonitoring
            ? "linear-gradient(90deg, #22c55e, #3b82f6, #8b5cf6)"
            : "var(--color-border-subtle)",
          transition: "background 0.3s ease",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.5rem" }}>📊</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
              Live Signal Strength Monitor
            </h3>
            <p style={{ margin: "0.125rem 0 0", fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
              Continuous real-time signal measurement & RSSI tracking
            </p>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Refresh Rate:</span>
            <select
              className="input"
              value={intervalSec}
              onChange={(e) => onChangeInterval(Number(e.target.value))}
              style={{ width: "auto", padding: "0.25rem 0.5rem", fontSize: "0.8125rem" }}
              aria-label="Live monitor refresh rate"
            >
              <option value={3}>⚡ Fast (3s)</option>
              <option value={5}>🚀 Normal (5s)</option>
              <option value={10}>⏱ Standard (10s)</option>
              <option value={30}>🐢 Slow (30s)</option>
            </select>
          </div>

          <button
            id="live-monitor-toggle"
            className={`btn ${isMonitoring ? "btn-secondary" : "btn-primary"}`}
            onClick={onToggleMonitoring}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              borderColor: isMonitoring ? "#22c55e" : undefined,
              boxShadow: isMonitoring ? "0 0 12px rgba(34, 197, 94, 0.25)" : undefined,
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: isMonitoring ? "#22c55e" : "var(--color-text-muted)",
                boxShadow: isMonitoring ? "0 0 8px #22c55e" : "none",
                display: "inline-block",
              }}
            />
            {isMonitoring ? "Pause Live Monitor" : "▶ Start Live Monitor"}
          </button>
        </div>
      </div>

      {/* Main Signal Gauge Display */}
      {activeNet ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", background: "rgba(15,23,42,0.6)", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid var(--color-border-subtle)" }}>
          {/* Signal Level Meter */}
          <div>
            <p style={{ margin: "0 0 0.25rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)" }}>
              Target Network ({activeNet.band})
            </p>
            <p style={{ margin: "0 0 0.5rem", fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text-primary)", wordBreak: "break-all" }}>
              {activeNet.ssid || "Wi-Fi Network"}
            </p>

            <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
              <span style={{ fontSize: "2.5rem", fontWeight: 800, color: qualityColor, lineHeight: 1 }}>
                {rssi != null ? `${rssi} dBm` : "—"}
              </span>
              {deltaInfo && (
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: deltaInfo.color }}>
                  {deltaInfo.formatted}
                </span>
              )}
            </div>

            {/* Progress / Signal Strength Gauge Bar */}
            <div style={{ marginTop: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
                <span>Signal Quality</span>
                <span>{percentage}% ({activeNet.signal_quality})</span>
              </div>
              <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${percentage}%`,
                    height: "100%",
                    background: qualityColor,
                    borderRadius: "4px",
                    transition: "width 0.5s ease, background 0.5s ease",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Session Statistics */}
          {stats && (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", borderLeft: "1px solid rgba(255,255,255,0.08)", paddingLeft: "1.25rem" }}>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)" }}>
                Session Signal Stats ({stats.sampleCount} samples)
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", fontSize: "0.875rem" }}>
                <div>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>Peak Signal:</span>
                  <br />
                  <strong style={{ color: "#22c55e" }}>{stats.max} dBm</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>Lowest Signal:</span>
                  <br />
                  <strong style={{ color: "#ef4444" }}>{stats.min} dBm</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>Average RSSI:</span>
                  <br />
                  <strong style={{ color: "var(--color-blue-400)" }}>{stats.avg} dBm</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>Stability Index:</span>
                  <br />
                  <strong style={{ color: "var(--color-text-primary)" }}>{stats.stability}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "1.5rem" }}>
          No networks detected yet. Start a scan or enable Live Monitor to stream signal measurements.
        </p>
      )}
    </div>
  );
}
