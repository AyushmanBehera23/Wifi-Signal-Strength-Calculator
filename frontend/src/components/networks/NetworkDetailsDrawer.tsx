import type { NetworkObservation } from "../../types/wifi";
import { SignalBadge } from "./SignalBadge";

interface NetworkDetailsDrawerProps {
  network: NetworkObservation;
  onClose: () => void;
}

function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0.625rem 0", borderBottom: "1px solid var(--color-border-subtle)" }}>
      <span style={{ color: "var(--color-text-secondary)", fontSize: "0.8125rem", flexShrink: 0, marginRight: "1rem" }}>{label}</span>
      <span style={{ fontSize: "0.875rem", textAlign: "right", fontFamily: mono ? "var(--font-family-mono)" : "inherit", wordBreak: "break-all" }}>
        {value ?? <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>Not reported</span>}
      </span>
    </div>
  );
}

function CopyValue({ value }: { value: string }) {
  const copy = () => navigator.clipboard.writeText(value);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
      <span className="mono">{value}</span>
      <button
        className="btn btn-ghost"
        style={{ padding: "0.125rem 0.375rem", fontSize: "0.7rem" }}
        onClick={copy}
        aria-label={`Copy ${value}`}
        title="Copy to clipboard"
      >
        ⎘
      </button>
    </span>
  );
}

export function NetworkDetailsDrawer({ network, onClose }: NetworkDetailsDrawerProps) {
  const title = network.ssid ?? "(Hidden network)";

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <aside
        className="drawer"
        role="complementary"
        aria-label={`Network details for ${title}`}
      >
        {/* Header */}
        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "var(--color-navy-800)", zIndex: 1 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>{title}</h2>
            {network.bssid && (
              <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-muted)", fontSize: "0.75rem", fontFamily: "var(--font-family-mono)" }}>{network.bssid}</p>
            )}
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close details" style={{ fontSize: "1.25rem", padding: "0.25rem 0.5rem" }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem" }}>
          {/* Signal */}
          <section aria-labelledby="section-signal">
            <h3 id="section-signal" style={{ margin: "0 0 1rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>Signal</h3>
            <div style={{ marginBottom: "1rem" }}>
              <SignalBadge quality={network.signal_quality} dbm={network.signal_dbm} />
            </div>
            <p style={{ margin: "0 0 1rem", fontSize: "0.75rem", color: "var(--color-text-muted)", fontStyle: "italic" }}>
              RSSI is a received-signal measurement at the scan location and does not guarantee throughput or latency.
            </p>
            <Row label="Signal strength" value={network.signal_dbm != null ? `${network.signal_dbm} dBm` : null} mono />
            <Row label="Signal quality" value={network.signal_quality} />
          </section>

          {/* Network identity */}
          <section aria-labelledby="section-identity" style={{ marginTop: "1.5rem" }}>
            <h3 id="section-identity" style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>Identity</h3>
            <Row label="SSID" value={network.ssid ?? <em style={{ color: "var(--color-text-muted)" }}>Hidden network</em>} />
            <Row label="BSSID" value={network.bssid ? <CopyValue value={network.bssid} /> : null} />
            <Row label="Security" value={network.security} />
          </section>

          {/* Frequency */}
          <section aria-labelledby="section-freq" style={{ marginTop: "1.5rem" }}>
            <h3 id="section-freq" style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>Frequency</h3>
            <Row label="Band" value={network.band} />
            <Row label="Frequency" value={network.frequency_mhz != null ? `${network.frequency_mhz} MHz` : null} mono />
            <Row label="Channel" value={network.channel} mono />
            <Row label="Channel width" value={network.channel_width_mhz != null ? `${network.channel_width_mhz} MHz` : null} />
            <Row label="Wi-Fi standard" value={network.wifi_standard} />
          </section>

          {/* Timestamps */}
          <section aria-labelledby="section-time" style={{ marginTop: "1.5rem" }}>
            <h3 id="section-time" style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>Observation</h3>
            <Row label="First seen" value={network.first_seen_at ? new Date(network.first_seen_at).toLocaleString() : null} />
            <Row label="Last seen" value={network.last_seen_at ? new Date(network.last_seen_at).toLocaleString() : null} />
            <Row label="Data quality" value={<span style={{ textTransform: "capitalize" }}>{network.data_quality}</span>} />
            <Row label="Scanner source" value={network.scanner_source} />
          </section>

          {/* Partial data notice */}
          {network.data_quality !== "complete" && (
            <div style={{ marginTop: "1.5rem", padding: "0.875rem", background: "rgba(250,204,21,0.08)", borderRadius: "0.75rem", border: "1px solid rgba(250,204,21,0.2)" }}>
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "#facc15" }}>
                <strong>Partial data:</strong> Some fields were not reported by the scanner. Unavailable values are shown as "Not reported" — they are never guessed.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
