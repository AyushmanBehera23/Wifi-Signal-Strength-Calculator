import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChannelCongestionChart } from "../components/charts/DashboardCharts";
import { getChannelAnalysis } from "../services/api";
import type { ChannelAnalysisResponse, ChannelRecommendation } from "../types/wifi";

function RecommendationCard({ rec }: { rec: ChannelRecommendation }) {
  const [showWhy, setShowWhy] = useState(false);
  const scorePercent = (rec.congestion_score * 100).toFixed(0);
  const scoreColor =
    rec.congestion_score < 0.3 ? "#22c55e" : rec.congestion_score < 0.6 ? "#facc15" : "#ef4444";

  return (
    <div className="card" style={{ borderColor: "rgba(59,130,246,0.2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
        <div>
          <p style={{ margin: "0 0 0.25rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)" }}>
            {rec.band} · Estimated recommendation
          </p>
          <h3 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700 }}>
            {rec.recommended_channel != null ? `Channel ${rec.recommended_channel}` : "No recommendation"}
          </h3>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: "0 0 0.125rem", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Est. congestion</p>
          <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: scoreColor }}>{scorePercent}%</p>
        </div>
      </div>

      <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{rec.reasoning}</p>

      {rec.alternatives.length > 0 && (
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
          Alternatives: {rec.alternatives.map(ch => `Ch ${ch}`).join(", ")}
        </p>
      )}

      <button
        className="btn btn-ghost"
        style={{ fontSize: "0.8125rem", padding: "0.375rem 0" }}
        onClick={() => setShowWhy(!showWhy)}
        aria-expanded={showWhy}
        aria-controls={`why-${rec.band.replace(" ", "-")}`}
      >
        {showWhy ? "▲ Hide methodology" : "▼ Why this recommendation?"}
      </button>

      {showWhy && (
        <div id={`why-${rec.band.replace(" ", "-")}`} style={{ marginTop: "0.875rem", padding: "1rem", background: "var(--color-navy-800)", borderRadius: "0.75rem", borderLeft: "3px solid var(--color-blue-600)" }}>
          <p style={{ margin: "0 0 0.875rem", fontSize: "0.875rem", lineHeight: 1.7, color: "var(--color-text-secondary)" }}>{rec.methodology_summary}</p>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.8125rem" }}>Limitations of this estimate:</p>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {rec.limitations.map((l, i) => (
              <li key={i} style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>{l}</li>
            ))}
          </ul>
          <p style={{ margin: "0.875rem 0 0", fontSize: "0.75rem", color: "var(--color-text-muted)", fontStyle: "italic" }}>Analysis version: {rec.analysis_version}</p>
        </div>
      )}
    </div>
  );
}

export function Channels() {
  const [data, setData] = useState<ChannelAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"2.4 GHz" | "5 GHz" | "6 GHz">("2.4 GHz");

  useEffect(() => {
    getChannelAnalysis().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700 }}>Channel Analysis</h1>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-muted)" }}>Estimated channel occupancy and recommendations based on visible networks</p>
        </div>
        <Link to="/dashboard" className="btn btn-secondary">← Dashboard</Link>
      </div>

      {/* Disclaimer */}
      <div role="note" style={{ padding: "0.875rem 1.25rem", background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.2)", borderRadius: "0.875rem", marginBottom: "1.5rem", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
        ⚠️ <strong style={{ color: "#facc15" }}>Estimates only.</strong>{" "}
        {data?.limitation_notice ?? "These scores are derived from visible-network observations and do not measure actual airtime utilization, hidden networks, or non-Wi-Fi interference."}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 300 }} aria-label="Loading channel data" />
      ) : !data || (data.band_24.length === 0 && data.band_5.length === 0) ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem" }}>
          <p style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>No channel data</p>
          <p style={{ color: "var(--color-text-secondary)", margin: "0 0 1.5rem" }}>Run a scan first to see channel analysis.</p>
          <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
        </div>
      ) : (
        <>
          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <section aria-labelledby="rec-heading" style={{ marginBottom: "2rem" }}>
              <h2 id="rec-heading" style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "1rem" }}>Channel Recommendations</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
                {data.recommendations.map((rec) => (
                  <RecommendationCard key={rec.band} rec={rec} />
                ))}
              </div>
            </section>
          )}

          {/* Channel occupancy charts */}
          <section aria-labelledby="occupancy-heading">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 id="occupancy-heading" style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>Channel Occupancy</h2>
              <div role="tablist" style={{ display: "flex", gap: "0.375rem" }}>
                {(["2.4 GHz", "5 GHz", "6 GHz"] as const).map((b) => (
                  <button
                    key={b}
                    role="tab"
                    aria-selected={activeTab === b}
                    className="btn btn-ghost"
                    style={{ padding: "0.375rem 0.875rem", fontSize: "0.8125rem", background: activeTab === b ? "rgba(59,130,246,0.15)" : "transparent", color: activeTab === b ? "var(--color-blue-400)" : "var(--color-text-muted)" }}
                    onClick={() => setActiveTab(b)}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="card" role="tabpanel" aria-label={`${activeTab} channel occupancy`}>
              <ChannelCongestionChart
                occupancy={activeTab === "2.4 GHz" ? data.band_24 : activeTab === "5 GHz" ? data.band_5 : data.band_6}
                band={activeTab}
              />
            </div>

            {/* Channel detail table */}
            <div className="card" style={{ marginTop: "1.25rem", overflowX: "auto" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                {activeTab} channel detail
              </h3>
              <table className="data-table" aria-label={`${activeTab} channel details`}>
                <thead>
                  <tr>
                    <th scope="col">Channel</th>
                    <th scope="col">Freq (MHz)</th>
                    <th scope="col">Networks</th>
                    <th scope="col">Overlapping</th>
                    <th scope="col">Avg signal</th>
                    <th scope="col">Est. congestion</th>
                    <th scope="col">Networks on channel</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === "2.4 GHz" ? data.band_24 : activeTab === "5 GHz" ? data.band_5 : data.band_6)
                    .filter(o => o.network_count > 0)
                    .map((o) => {
                      const pct = (o.estimated_congestion * 100).toFixed(0);
                      const color = o.estimated_congestion < 0.3 ? "#22c55e" : o.estimated_congestion < 0.6 ? "#facc15" : "#ef4444";
                      return (
                        <tr key={o.channel}>
                          <td className="mono" style={{ fontWeight: 600 }}>Ch {o.channel}</td>
                          <td className="mono" style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>{o.frequency_mhz ?? "—"}</td>
                          <td>{o.network_count}</td>
                          <td style={{ color: "var(--color-text-secondary)" }}>{o.overlapping_network_count}</td>
                          <td className="mono" style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                            {o.avg_signal_dbm != null ? `${o.avg_signal_dbm} dBm` : "—"}
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <div style={{ flex: 1, height: 6, background: "var(--color-navy-700)", borderRadius: 3, overflow: "hidden", maxWidth: 80 }}>
                                <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
                              </div>
                              <span style={{ color, fontSize: "0.8125rem", fontWeight: 600, minWidth: "2.5rem" }}>{pct}%</span>
                            </div>
                          </td>
                          <td style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", maxWidth: "12rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {o.networks.join(", ") || "—"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
