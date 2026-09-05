import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BandDistributionChart,
  ChannelCongestionChart,
  LiveSignalTimelineChart,
  SignalDistributionChart,
} from "../components/charts/DashboardCharts";
import { NetworkTable } from "../components/networks/NetworkTable";
import { AgentStatusBadge } from "../components/status/AgentStatusBadge";
import { LiveSignalMeter } from "../components/status/LiveSignalMeter";
import { getChannelAnalysis } from "../services/api";
import type { ChannelAnalysisResponse } from "../types/wifi";
import { useAgentStatus } from "../hooks/useAgentStatus";
import { useScan } from "../hooks/useScan";

function SummaryCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="card card-sm" style={{ minWidth: 0 }}>
      <p style={{ margin: "0 0 0.375rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)" }}>{label}</p>
      <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: color || "var(--color-text-primary)", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{sub}</p>}
    </div>
  );
}

function StaleDataBanner({ lastScanTime, onRescan, isScanning }: { lastScanTime: Date | null; onRescan: () => void; isScanning: boolean }) {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    if (!lastScanTime) return;
    const check = () => setStale(Date.now() - lastScanTime.getTime() > 5 * 60 * 1000);
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, [lastScanTime]);

  if (!stale) return null;
  return (
    <div role="alert" style={{ padding: "0.75rem 1rem", background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.25)", borderRadius: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
      <span style={{ color: "#facc15", fontSize: "0.875rem" }}>
        ⚠️ Data is over 5 minutes old. Conditions may have changed.
      </span>
      <button className="btn btn-secondary" style={{ padding: "0.375rem 0.875rem", fontSize: "0.8125rem" }} onClick={onRescan} disabled={isScanning}>
        ↻ Rescan
      </button>
    </div>
  );
}

export function Dashboard() {
  const { health, isConnected, isLoading } = useAgentStatus();
  const { state: scanState, latestScan, triggerScan, loadLatest, lastScanTime } = useScan();
  const [channelData, setChannelData] = useState<ChannelAnalysisResponse | null>(null);
  const [activeChartBand, setActiveChartBand] = useState<"2.4 GHz" | "5 GHz" | "6 GHz">("2.4 GHz");
  const [isLiveMonitoring, setIsLiveMonitoring] = useState(true);
  const [liveIntervalSec, setLiveIntervalSec] = useState(5);

  // Buffer for live signal strength history over time
  const [liveHistory, setLiveHistory] = useState<
    Array<{ timestamp: string; readings: Record<string, number> }>
  >([]);

  // Load latest scan on mount
  useEffect(() => {
    loadLatest();
  }, []);

  // Update live signal history whenever scan completes
  const lastScanIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!latestScan || !latestScan.networks?.length) return;
    if (latestScan.scan_id === lastScanIdRef.current) return;
    lastScanIdRef.current = latestScan.scan_id;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const readings: Record<string, number> = {};
    for (const net of latestScan.networks) {
      if (net.signal_dbm != null) {
        const key = net.ssid || "Wi-Fi Network";
        readings[key] = net.signal_dbm;
      }
    }

    setLiveHistory((prev) => {
      const next = [...prev, { timestamp: timeStr, readings }];
      return next.slice(-25); // keep last 25 scans
    });

    getChannelAnalysis().then(setChannelData).catch(() => {});
  }, [latestScan]);

  // Live monitor continuous scanning timer
  useEffect(() => {
    if (!isLiveMonitoring || !isConnected) return;
    // Initial scan if idle
    if (scanState === "idle" && !latestScan) {
      triggerScan();
    }
    const timer = setInterval(() => {
      if (scanState !== "scanning") {
        triggerScan();
      }
    }, liveIntervalSec * 1000);
    return () => clearInterval(timer);
  }, [isLiveMonitoring, isConnected, liveIntervalSec, scanState, triggerScan, latestScan]);

  const networks = latestScan?.networks ?? [];
  const bandCounts = { "2.4 GHz": 0, "5 GHz": 0, "6 GHz": 0 };
  for (const n of networks) {
    if (n.band in bandCounts) bandCounts[n.band as keyof typeof bandCounts]++;
  }
  const strongest = networks.reduce<number | null>((best, n) => {
    if (n.signal_dbm == null) return best;
    return best === null || n.signal_dbm > best ? n.signal_dbm : best;
  }, null);

  const primaryRec = channelData?.recommendations[0];
  const insightText = primaryRec?.recommended_channel
    ? `Estimated: Channel ${primaryRec.recommended_channel} (${primaryRec.band}) appears least congested — score ${(primaryRec.congestion_score * 100).toFixed(0)}%. ${primaryRec.reasoning}`
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top Nav */}
      <header style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "rgba(10, 15, 30, 0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--color-border-subtle)",
        padding: "0.875rem 1.5rem",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.125rem" }}>📡</span>
            <span style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>Wi-Fi Analyzer</span>
          </Link>
          <nav aria-label="Main navigation" style={{ display: "flex", gap: "0.5rem" }}>
            {[
              { to: "/dashboard", label: "Dashboard" },
              { to: "/networks", label: "Networks" },
              { to: "/channels", label: "Channels" },
              { to: "/history", label: "History" },
            ].map(({ to, label }) => (
              <Link key={to} to={to} style={{ padding: "0.375rem 0.75rem", borderRadius: "0.5rem", textDecoration: "none", fontSize: "0.875rem", color: window.location.pathname === to ? "var(--color-blue-400)" : "var(--color-text-secondary)", background: window.location.pathname === to ? "rgba(59,130,246,0.1)" : "transparent" }}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {isLiveMonitoring && (
            <span
              className="badge"
              style={{
                background: "rgba(34,197,94,0.15)",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "#22c55e",
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 6px #22c55e",
                }}
              />
              LIVE MONITORING
            </span>
          )}
          <AgentStatusBadge health={health} isConnected={isConnected} isLoading={isLoading} />
          <Link to="/settings" className="btn btn-ghost" style={{ padding: "0.375rem 0.5rem" }} aria-label="Settings">⚙</Link>
        </div>
      </header>

      <main id="main-content" style={{ flex: 1, padding: "1.5rem", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        {/* Stale Data Banner */}
        <StaleDataBanner lastScanTime={lastScanTime} onRescan={triggerScan} isScanning={scanState === "scanning"} />

        {/* Live Signal Meter Card */}
        <div style={{ marginBottom: "1.25rem" }}>
          <LiveSignalMeter
            networks={networks}
            history={liveHistory}
            isMonitoring={isLiveMonitoring}
            onToggleMonitoring={() => setIsLiveMonitoring((prev) => !prev)}
            intervalSec={liveIntervalSec}
            onChangeInterval={setLiveIntervalSec}
          />
        </div>

        {/* Action Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          <button
            id="scan-button"
            className="btn btn-primary"
            onClick={() => triggerScan()}
            disabled={!isConnected || scanState === "scanning"}
            aria-busy={scanState === "scanning"}
          >
            {scanState === "scanning" ? "⏳ Scanning…" : "📡 Manual Sweep"}
          </button>

          {lastScanTime && (
            <span style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginLeft: "auto" }}>
              Last scan: {lastScanTime.toLocaleTimeString()} ({networks.length} networks visible)
            </span>
          )}
        </div>

        {/* Agent disconnected state */}
        {!isConnected && !isLoading && (
          <div role="alert" className="card" style={{ borderColor: "rgba(239,68,68,0.3)", textAlign: "center", padding: "2.5rem 2rem" }}>
            <p style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>⚠️</p>
            <h2 style={{ margin: "0 0 0.5rem" }}>Local agent not reachable</h2>
            <p style={{ color: "var(--color-text-secondary)", margin: "0 0 1rem" }}>
              Start the agent with <code className="mono" style={{ background: "var(--color-navy-700)", padding: "0.125rem 0.375rem", borderRadius: "0.25rem" }}>./backend/start_agent.sh</code> and try again.
            </p>

            {typeof window !== "undefined" && window.location.protocol === "https:" && (
              <div style={{ maxWidth: "600px", margin: "1rem auto 1.5rem", textAlign: "left", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "0.75rem", padding: "0.875rem 1rem", fontSize: "0.8125rem", color: "#fca5a5" }}>
                <p style={{ margin: "0 0 0.375rem", fontWeight: 700, color: "#f87171" }}>🔒 Brave / Chrome Local Network Permission (Vercel)</p>
                <p style={{ margin: 0 }}>
                  You are viewing this site over <strong>HTTPS (Vercel)</strong>. Brave/Chrome block local HTTP agent calls (<code className="mono">http://127.0.0.1:8000</code>) by default.
                </p>
                <p style={{ margin: "0.375rem 0 0", color: "#e2e8f0" }}>
                  <strong>Fix in Brave Settings:</strong> Set both <strong>Insecure content</strong> AND <strong>Local network</strong> to <strong>Allow</strong>, then refresh! Or use <code className="mono">http://localhost:5173</code> locally.
                </p>
              </div>
            )}

            <Link to="/help" className="btn btn-secondary">View setup instructions</Link>
          </div>
        )}

        {/* Summary cards */}
        {(networks.length > 0 || latestScan) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.875rem", marginBottom: "1.25rem" }}>
            <SummaryCard label="Total networks" value={networks.length} />
            <SummaryCard label="2.4 GHz" value={bandCounts["2.4 GHz"]} color="var(--color-blue-400)" />
            <SummaryCard label="5 GHz" value={bandCounts["5 GHz"]} color="#8b5cf6" />
            <SummaryCard label="6 GHz" value={bandCounts["6 GHz"]} color="#06b6d4" />
            <SummaryCard
              label="Strongest signal"
              value={strongest != null ? `${strongest} dBm` : "—"}
              sub={strongest != null ? (strongest >= -50 ? "Excellent" : strongest >= -60 ? "Good" : strongest >= -67 ? "Fair" : "Weak") : ""}
            />
          </div>
        )}

        {/* Live Signal Timeline Chart */}
        <div className="card" style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                📈 Real-time Signal Strength Timeline (dBm over Time)
              </h3>
              <p style={{ margin: "0.125rem 0 0", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                Tracks live RSSI fluctuation across consecutive scans for all visible Wi-Fi networks
              </p>
            </div>
            {isLiveMonitoring && (
              <span style={{ fontSize: "0.75rem", color: "#22c55e", fontWeight: 600 }}>
                Updating every {liveIntervalSec}s…
              </span>
            )}
          </div>
          <LiveSignalTimelineChart history={liveHistory} />
        </div>

        {/* Insight banner */}
        {insightText && (
          <div role="note" style={{ padding: "0.875rem 1.25rem", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "0.875rem", marginBottom: "1.25rem", fontSize: "0.9375rem" }}>
            <strong>💡 Insight (estimated):</strong>{" "}
            <span style={{ color: "var(--color-text-secondary)" }}>{insightText}</span>
          </div>
        )}

        {/* Visualization grid */}
        {networks.length > 0 && channelData && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", marginBottom: "1.5rem" }}>
            <div className="card">
              <h3 style={{ margin: "0 0 1rem", fontSize: "0.875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-secondary)" }}>Signal distribution</h3>
              <SignalDistributionChart networks={networks} />
            </div>
            <div className="card">
              <h3 style={{ margin: "0 0 1rem", fontSize: "0.875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-secondary)" }}>Band distribution</h3>
              <BandDistributionChart networks={networks} />
            </div>
            <div className="card" style={{ gridColumn: "span 1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-secondary)" }}>
                  Est. channel congestion
                </h3>
                <div style={{ display: "flex", gap: "0.375rem" }}>
                  {(["2.4 GHz", "5 GHz", "6 GHz"] as const).map((b) => (
                    <button
                      key={b}
                      className={`btn btn-ghost`}
                      style={{ padding: "0.25rem 0.625rem", fontSize: "0.75rem", background: activeChartBand === b ? "rgba(59,130,246,0.15)" : "transparent", color: activeChartBand === b ? "var(--color-blue-400)" : "var(--color-text-muted)" }}
                      onClick={() => setActiveChartBand(b)}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <ChannelCongestionChart
                occupancy={activeChartBand === "2.4 GHz" ? channelData.band_24 : activeChartBand === "5 GHz" ? channelData.band_5 : channelData.band_6}
                band={activeChartBand}
              />
              <p style={{ margin: "0.75rem 0 0", fontSize: "0.75rem", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                Estimates from visible networks only. Does not measure actual airtime utilization.
              </p>
            </div>
          </div>
        )}

        {/* Networks table */}
        {networks.length > 0 && (
          <div className="card">
            <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 600 }}>Nearby networks ({networks.length})</h2>
            <NetworkTable networks={networks} />
          </div>
        )}

        {/* Empty state */}
        {scanState !== "scanning" && networks.length === 0 && isConnected && (
          <div className="card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <p style={{ fontSize: "2.5rem", margin: "0 0 0.75rem" }}>📡</p>
            <h2 style={{ margin: "0 0 0.5rem" }}>No scan data yet</h2>
            <p style={{ color: "var(--color-text-secondary)", margin: "0 0 1.5rem" }}>
              Run a scan or start Live Monitoring to see nearby networks in real-time.
            </p>
            <button className="btn btn-primary" onClick={() => triggerScan()} disabled={!isConnected}>
              📡 Start scan
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

