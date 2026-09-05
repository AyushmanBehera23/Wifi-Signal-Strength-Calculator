import { Link } from "react-router-dom";

export function Settings() {
  return (
    <div style={{ padding: "1.5rem", maxWidth: "700px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>Settings</h1>
        <Link to="/dashboard" className="btn btn-secondary">← Back</Link>
      </div>

      {/* Connection */}
      <section aria-labelledby="conn-heading" className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 id="conn-heading" style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 600 }}>Scanner connection</h2>
        <p style={{ margin: "0 0 0.75rem", color: "var(--color-text-secondary)", fontSize: "0.9375rem" }}>
          The agent runs locally at <code className="mono" style={{ background: "var(--color-navy-700)", padding: "0.125rem 0.375rem", borderRadius: "0.25rem" }}>http://127.0.0.1:8000</code>. This cannot be changed — the agent binds to loopback for privacy.
        </p>
        <Link to="/help#setup" className="btn btn-secondary" style={{ display: "inline-flex" }}>View setup instructions</Link>
      </section>

      {/* Privacy */}
      <section aria-labelledby="privacy-heading" className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 id="privacy-heading" style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 600 }}>Privacy</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {[
            "Scan data is stored in a local SQLite file on your Mac only.",
            "BSSID and SSID values are local network identifiers — never transmitted remotely by default.",
            "The agent does not collect Wi-Fi passwords or connect to networks.",
          ].map((item) => (
            <p key={item} style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.9375rem" }}>✓ {item}</p>
          ))}
        </div>
      </section>

      {/* Data controls */}
      <section aria-labelledby="data-heading" className="card" style={{ marginBottom: "1.25rem", borderColor: "rgba(239,68,68,0.2)" }}>
        <h2 id="data-heading" style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 600 }}>Data</h2>
        <p style={{ margin: "0 0 1rem", color: "var(--color-text-secondary)", fontSize: "0.9375rem" }}>
          Delete all locally stored scan history. This cannot be undone.
        </p>
        <Link to="/history" className="btn btn-danger">Manage / Delete history</Link>
      </section>

      {/* Version */}
      <section aria-labelledby="ver-heading" className="card">
        <h2 id="ver-heading" style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600 }}>Version</h2>
        <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
          Wi-Fi Signal Analyzer v1.0 · Analysis engine v1.0 · macOS local agent
        </p>
      </section>
    </div>
  );
}
