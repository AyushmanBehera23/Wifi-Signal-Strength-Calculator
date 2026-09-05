import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AgentStatusBadge } from "../components/status/AgentStatusBadge";
import { useAgentStatus } from "../hooks/useAgentStatus";
import { useScan } from "../hooks/useScan";

// Example networks for the preview (clearly labeled)
const EXAMPLE_NETWORKS = [
  { ssid: "HomeNetwork_5G", band: "5 GHz", channel: 36, signal_dbm: -45, signal_quality: "Excellent", security: "WPA3" },
  { ssid: "Neighbor-WiFi", band: "2.4 GHz", channel: 6, signal_dbm: -62, signal_quality: "Fair", security: "WPA2" },
  { ssid: "Office-Guest", band: "2.4 GHz", channel: 11, signal_dbm: -74, signal_quality: "Weak", security: "WPA2" },
  { ssid: "Xfinity_Fast", band: "5 GHz", channel: 149, signal_dbm: -58, signal_quality: "Good", security: "WPA2" },
];

const SIGNAL_COLORS: Record<string, string> = {
  Excellent: "#22c55e",
  Good: "#86efac",
  Fair: "#facc15",
  Weak: "#f97316",
  "Very weak": "#ef4444",
};

function ValueCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{icon}</div>
      <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.0625rem", fontWeight: 600 }}>{title}</h3>
      <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}

function HowItWorksStep({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", background: "var(--color-blue-600)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: "0.9375rem", flexShrink: 0,
      }}>{num}</div>
      <div>
        <h4 style={{ margin: "0 0 0.25rem", fontWeight: 600 }}>{title}</h4>
        <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>{desc}</p>
      </div>
    </div>
  );
}

export function Landing() {
  const navigate = useNavigate();
  const { isConnected, isLoading, health, refresh } = useAgentStatus();
  const { state: scanState, triggerScan } = useScan();
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    if (scanState === "success" && !hasScanned) {
      setHasScanned(true);
      setTimeout(() => navigate("/dashboard"), 600);
    }
  }, [scanState, hasScanned, navigate]);

  const handleStartScan = async () => {
    if (!isConnected) return;
    await triggerScan();
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "rgba(10, 15, 30, 0.9)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--color-border-subtle)",
        padding: "0.875rem 1.5rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.25rem" }}>📡</span>
          <span style={{ fontWeight: 700, fontSize: "1.0625rem", color: "var(--color-text-primary)" }}>Wi-Fi Analyzer</span>
          <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", background: "var(--color-navy-700)", padding: "0.125rem 0.5rem", borderRadius: "0.25rem" }}>Local</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <nav aria-label="Site navigation" style={{ display: "flex", gap: "1rem" }}>
            <Link to="/help" style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", textDecoration: "none" }}>Help</Link>
            <Link to="/settings" style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", textDecoration: "none" }}>Settings</Link>
          </nav>
          <AgentStatusBadge health={health} isConnected={isConnected} isLoading={isLoading} />
        </div>
      </header>

      <main id="main-content">
        {/* Hero */}
        <section aria-labelledby="hero-heading" style={{
          textAlign: "center", padding: "5rem 1.5rem 4rem",
          background: "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(59,130,246,0.12) 0%, transparent 70%)",
        }}>
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
              borderRadius: "100px", padding: "0.375rem 1rem", marginBottom: "1.5rem",
              fontSize: "0.8125rem", color: "var(--color-blue-400)",
            }}>
              🔒 Local-first · Privacy by default · No cloud account
            </div>

            <h1 id="hero-heading" style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 800, lineHeight: 1.15, margin: "0 0 1.25rem", letterSpacing: "-0.02em" }}>
              Understand the Wi-Fi{" "}
              <span style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                around you
              </span>
            </h1>

            <p style={{ fontSize: "1.125rem", color: "var(--color-text-secondary)", margin: "0 0 2.5rem", lineHeight: 1.7, maxWidth: "540px", marginLeft: "auto", marginRight: "auto" }}>
              See nearby networks, understand signal strength in dBm, find less crowded channels —
              all from a local agent on your Mac. No cloud. No accounts.
            </p>

            <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                id="start-scan-btn"
                className="btn btn-primary btn-lg glow-blue"
                onClick={handleStartScan}
                disabled={!isConnected || scanState === "scanning"}
                aria-busy={scanState === "scanning"}
                aria-describedby="scan-status-desc"
              >
                {scanState === "scanning" ? (
                  <>
                    <span aria-hidden="true" style={{ display: "inline-block", animation: "spin 1s linear infinite", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
                    Scanning…
                  </>
                ) : (
                  <>📡 Start a local scan</>
                )}
              </button>
              <Link to="/help" className="btn btn-secondary btn-lg">How it works</Link>
            </div>

            <p id="scan-status-desc" style={{ marginTop: "1rem", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
              {!isConnected && !isLoading
                ? "⚠️ Local agent not detected — see setup instructions below."
                : scanState === "error"
                ? "⚠️ Scan failed. Try again or check Help."
                : "Scan reads nearby networks from macOS — no network changes are made."}
            </p>
          </div>
        </section>

        {/* Live Status Panel */}
        <section aria-labelledby="status-panel-heading" style={{ maxWidth: "900px", margin: "0 auto", padding: "0 1.5rem 3rem" }}>
          <div className="card" style={{ borderColor: isConnected ? "rgba(59,130,246,0.3)" : "rgba(239,68,68,0.3)" }}>
            <h2 id="status-panel-heading" style={{ margin: "0 0 1rem", fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>
              Scanner status
            </h2>
            {!isConnected && !isLoading ? (
              <div>
                <p style={{ color: "#ef4444", fontWeight: 600, margin: "0 0 0.75rem" }}>⛔ Local agent not reachable</p>
                <p style={{ color: "var(--color-text-secondary)", margin: "0 0 1rem", fontSize: "0.9375rem" }}>
                  The scanning agent runs on your Mac and exposes a local API at <code className="mono" style={{ background: "var(--color-navy-700)", padding: "0.125rem 0.375rem", borderRadius: "0.25rem" }}>127.0.0.1:8000</code>. Start it before scanning.
                </p>

                {typeof window !== "undefined" && window.location.protocol === "https:" && (
                  <div role="alert" style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "0.75rem", padding: "0.875rem 1rem", marginBottom: "1rem", fontSize: "0.8125rem", color: "#fca5a5" }}>
                    <p style={{ margin: "0 0 0.375rem", fontWeight: 700, color: "#f87171" }}>🔒 Browser HTTPS Security Lock</p>
                    <p style={{ margin: 0 }}>
                      You are viewing this site over <strong>HTTPS (Vercel)</strong>. Browsers block HTTP requests to local agents (<code className="mono">http://127.0.0.1:8000</code>) due to Mixed Content policies.
                    </p>
                    <p style={{ margin: "0.375rem 0 0", color: "#e2e8f0" }}>
                      <strong>Fix:</strong> Click the browser lock/shield icon in the address bar ➔ <strong>Site Settings</strong> ➔ set <strong>Insecure content</strong> to <strong>Allow</strong>, then refresh!
                    </p>
                  </div>
                )}

                <div style={{ background: "var(--color-navy-800)", borderRadius: "0.75rem", padding: "1rem", fontFamily: "var(--font-family-mono)", fontSize: "0.8125rem", color: "#86efac", marginBottom: "1rem" }}>
                  <p style={{ margin: "0 0 0.25rem", color: "var(--color-text-muted)" }}># In a new terminal window:</p>
                  <p style={{ margin: 0 }}>cd /path/to/WEB-APP-WIFI-Signal-Detect/backend</p>
                  <p style={{ margin: 0 }}>./start_agent.sh</p>
                </div>
                <button className="btn btn-secondary" onClick={refresh}>↻ Check again</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
                {[
                  { label: "Agent", value: isConnected ? "Connected" : "—", ok: isConnected },
                  { label: "Scanner source", value: health?.scanner_source ?? "—", ok: !!health?.scanner_source && health.scanner_source !== "none" },
                  { label: "Wi-Fi interface", value: health?.interface_available ? "Available" : "Unavailable", ok: health?.interface_available },
                  { label: "macOS", value: health?.macos_version ?? "—", ok: true },
                ].map(({ label, value, ok }) => (
                  <div key={label}>
                    <p style={{ margin: "0 0 0.25rem", fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
                    <p style={{ margin: 0, fontWeight: 600, color: ok ? "var(--color-text-primary)" : "#ef4444" }}>{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Preview section */}
        <section aria-labelledby="preview-heading" style={{ maxWidth: "900px", margin: "0 auto", padding: "0 1.5rem 4rem" }}>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 id="preview-heading" style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Dashboard preview</h2>
              <span className="badge" style={{ background: "rgba(250,204,21,0.15)", border: "1px solid rgba(250,204,21,0.3)", color: "#facc15" }}>
                ⚠ Example data — not your environment
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" aria-label="Example network data (not real)">
                <thead>
                  <tr>
                    <th scope="col">SSID</th>
                    <th scope="col">Band</th>
                    <th scope="col">Channel</th>
                    <th scope="col">Signal</th>
                    <th scope="col">Security</th>
                  </tr>
                </thead>
                <tbody>
                  {EXAMPLE_NETWORKS.map((n) => (
                    <tr key={n.ssid}>
                      <td>{n.ssid}</td>
                      <td><span className="badge" style={{ background: "var(--color-navy-700)" }}>{n.band}</span></td>
                      <td className="mono">{n.channel}</td>
                      <td>
                        <span style={{ color: SIGNAL_COLORS[n.signal_quality], fontWeight: 600, fontSize: "0.8125rem" }}>
                          {n.signal_dbm} dBm · {n.signal_quality}
                        </span>
                      </td>
                      <td style={{ color: "var(--color-text-secondary)", fontSize: "0.8125rem" }}>{n.security}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Value cards */}
        <section aria-labelledby="value-heading" style={{ maxWidth: "900px", margin: "0 auto", padding: "0 1.5rem 4rem" }}>
          <h2 id="value-heading" style={{ textAlign: "center", marginBottom: "2rem", fontSize: "1.5rem", fontWeight: 700 }}>What you get</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
            <ValueCard icon="📶" title="Measure signal" description="See nearby network signal strength in dBm with plain-language labels: Excellent, Good, Fair, Weak, or Very weak. No guessing." />
            <ValueCard icon="📊" title="Understand congestion" description="Estimated channel occupancy and overlap help you find a less crowded channel for your router. Clearly labeled as estimates." />
            <ValueCard icon="🔒" title="Keep data local" description="Scan data stays on your Mac. The agent binds to 127.0.0.1 only. No cloud account. No remote transmission by default." />
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="how-heading" style={{ maxWidth: "600px", margin: "0 auto", padding: "0 1.5rem 4rem" }}>
          <h2 id="how-heading" style={{ textAlign: "center", marginBottom: "2rem", fontSize: "1.5rem", fontWeight: 700 }}>How it works</h2>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <HowItWorksStep num={1} title="Run the local agent" desc="Start the Python agent on your Mac with one command. It reads Wi-Fi data from macOS and serves it locally at 127.0.0.1:8000." />
            <div className="divider" />
            <HowItWorksStep num={2} title="Scan from the browser" desc="Click 'Start a local scan' in this interface. The agent reads nearby networks using macOS APIs and returns normalized results." />
            <div className="divider" />
            <HowItWorksStep num={3} title="Understand the results" desc="See signal strength in dBm, compare channels, and get an estimated recommendation — with explanations of what each measurement means." />
          </div>
        </section>

        {/* Trust section */}
        <section aria-labelledby="trust-heading" style={{ maxWidth: "900px", margin: "0 auto", padding: "0 1.5rem 4rem" }}>
          <div className="card" style={{ background: "rgba(59,130,246,0.05)", borderColor: "rgba(59,130,246,0.2)" }}>
            <h2 id="trust-heading" style={{ margin: "0 0 1rem", fontSize: "1.125rem", fontWeight: 700 }}>Privacy and safety</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
              {[
                "✓ Does not collect Wi-Fi passwords",
                "✓ Does not connect to networks",
                "✓ Does not change router settings",
                "✓ Does not transmit scan data remotely",
                "✓ Agent binds to 127.0.0.1 only",
                "✓ Scan history stored locally in SQLite",
              ].map((item) => (
                <p key={item} style={{ margin: 0, fontSize: "0.9375rem", color: "var(--color-text-secondary)" }}>{item}</p>
              ))}
            </div>
          </div>
        </section>

        {/* Compatibility */}
        <section aria-labelledby="compat-heading" style={{ maxWidth: "900px", margin: "0 auto", padding: "0 1.5rem 4rem" }}>
          <h2 id="compat-heading" style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.75rem" }}>Compatibility</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            {[
              { label: "Platform", value: "macOS 13 Ventura and later" },
              { label: "Browser", value: "Any modern browser on the same Mac" },
              { label: "Fields", value: "Available fields depend on macOS version and Wi-Fi hardware" },
            ].map(({ label, value }) => (
              <div key={label} className="card card-sm">
                <p style={{ margin: "0 0 0.25rem", fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
                <p style={{ margin: 0, fontSize: "0.9375rem" }}>{value}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid var(--color-border-subtle)",
        padding: "1.5rem",
        display: "flex", justifyContent: "space-between", flexWrap: "wrap",
        gap: "1rem",
        color: "var(--color-text-muted)", fontSize: "0.8125rem",
      }}>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <Link to="/help" style={{ color: "inherit", textDecoration: "none" }}>Help</Link>
          <Link to="/help#privacy" style={{ color: "inherit", textDecoration: "none" }}>Privacy</Link>
          <Link to="/help#limitations" style={{ color: "inherit", textDecoration: "none" }}>Limitations</Link>
          <Link to="/help#accessibility" style={{ color: "inherit", textDecoration: "none" }}>Accessibility</Link>
        </div>
        <div>Wi-Fi Signal Analyzer v1.0 · Local-first · macOS</div>
      </footer>
    </div>
  );
}
