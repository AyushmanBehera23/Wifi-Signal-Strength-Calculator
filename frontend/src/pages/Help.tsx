import { Link } from "react-router-dom";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="card" style={{ marginBottom: "1.25rem" }}>
      <h2 id={id} style={{ margin: "0 0 1rem", fontSize: "1.125rem", fontWeight: 700 }}>{title}</h2>
      {children}
    </section>
  );
}

const SIGNAL_TABLE = [
  { range: "−30 to −50 dBm", label: "Excellent", guidance: "Strong signal at the current location." },
  { range: "−51 to −60 dBm", label: "Good", guidance: "Generally suitable for common use." },
  { range: "−61 to −67 dBm", label: "Fair", guidance: "May be adequate but has less margin." },
  { range: "−68 to −75 dBm", label: "Weak", guidance: "Performance may vary with distance and interference." },
  { range: "Below −75 dBm", label: "Very weak", guidance: "Connection quality may be unreliable." },
];

export function Help() {
  return (
    <div style={{ padding: "1.5rem", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>Help & Documentation</h1>
        <Link to="/dashboard" className="btn btn-secondary">← Dashboard</Link>
      </div>

      {/* Quick links */}
      <nav aria-label="Help sections" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {["#setup", "#permissions", "#troubleshoot", "#terminology", "#limitations", "#accessibility", "#privacy"].map((href) => (
          <a key={href} href={href} className="btn btn-ghost" style={{ fontSize: "0.8125rem", padding: "0.375rem 0.75rem" }}>
            {href.slice(1).charAt(0).toUpperCase() + href.slice(2)}
          </a>
        ))}
      </nav>

      <Section id="setup" title="macOS Setup">
        <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "1rem" }}>
          You need Python 3.11+ and a terminal. The agent uses macOS Wi-Fi APIs — no third-party system software required.
        </p>
        <div style={{ background: "var(--color-navy-800)", borderRadius: "0.75rem", padding: "1rem", fontFamily: "var(--font-family-mono)", fontSize: "0.8125rem", color: "#86efac", marginBottom: "1rem" }}>
          <p style={{ margin: "0 0 0.25rem", color: "var(--color-text-muted)" }}># 1. Navigate to backend directory</p>
          <p style={{ margin: "0 0 0.5rem" }}>cd /path/to/WEB-APP-WIFI-Signal-Detect/backend</p>
          <p style={{ margin: "0 0 0.25rem", color: "var(--color-text-muted)" }}># 2. Start the agent (installs deps automatically)</p>
          <p style={{ margin: 0 }}>./start_agent.sh</p>
        </div>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          The agent starts at <code className="mono">http://127.0.0.1:8000</code>. Open this app in your browser and click "Start a local scan."
        </p>
      </Section>

      <Section id="permissions" title="macOS Permissions">
        <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "0.75rem" }}>
          On macOS 13 Ventura and later, scanning for Wi-Fi networks may require Location Services to be enabled for the Terminal app or for the specific scanner tool.
        </p>
        <ol style={{ color: "var(--color-text-secondary)", lineHeight: 1.9, paddingLeft: "1.25rem", margin: "0 0 0.75rem" }}>
          <li>Open <strong>System Settings → Privacy & Security → Location Services</strong></li>
          <li>Enable Location Services</li>
          <li>Scroll down and enable access for <strong>Terminal</strong> (or the terminal app you use)</li>
          <li>Restart the agent and try scanning again</li>
        </ol>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", fontStyle: "italic" }}>
          Note: On macOS 14 Sonoma and later, the airport utility behavior may vary. The agent will automatically fall back to system_profiler if airport is unavailable.
        </p>
      </Section>

      <Section id="troubleshoot" title="Troubleshooting">
        {[
          { q: "The agent is not reachable", a: "Make sure start_agent.sh is running in a terminal. Check that port 8000 is not blocked by another process: lsof -i :8000" },
          { q: "Scan returns 0 networks", a: "Ensure your Mac's Wi-Fi is turned on. Check Location Services permissions. On macOS 14+, full scan data requires Location Services for Terminal." },
          { q: "Some fields show 'Not reported'", a: "The scanner could not determine this value from macOS APIs. This is expected — the app never guesses missing values." },
          { q: "The frontend cannot connect to the agent", a: "Check that the agent is running and your browser is accessing localhost:5173. The agent only allows connections from localhost." },
        ].map(({ q, a }) => (
          <details key={q} style={{ marginBottom: "0.75rem" }}>
            <summary style={{ cursor: "pointer", fontWeight: 600, padding: "0.5rem 0", color: "var(--color-text-primary)" }}>{q}</summary>
            <p style={{ margin: "0.5rem 0 0 1rem", color: "var(--color-text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6 }}>{a}</p>
          </details>
        ))}
      </Section>

      <Section id="terminology" title="Terminology">
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "1rem", fontSize: "0.9375rem", lineHeight: 1.7 }}>
          <strong>RSSI / dBm:</strong> Received Signal Strength Indicator, measured in decibel-milliwatts. Negative values — closer to 0 is stronger. This is a measurement at the scan location, not a guarantee of throughput.
        </p>
        <table className="data-table" aria-label="Signal quality thresholds" style={{ marginBottom: "1rem" }}>
          <thead>
            <tr>
              <th scope="col">RSSI range</th>
              <th scope="col">Label</th>
              <th scope="col">Guidance</th>
            </tr>
          </thead>
          <tbody>
            {SIGNAL_TABLE.map((row) => (
              <tr key={row.label}>
                <td className="mono" style={{ fontSize: "0.8125rem" }}>{row.range}</td>
                <td style={{ fontWeight: 600 }}>{row.label}</td>
                <td style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>{row.guidance}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", lineHeight: 1.7 }}>
          <strong>Band:</strong> The frequency range used — 2.4 GHz (longer range, more congested), 5 GHz (shorter range, faster), or 6 GHz (newest, least congested).<br />
          <strong>Channel:</strong> A subdivision of a band's frequency range. Channels 1, 6, and 11 are the non-overlapping options in 2.4 GHz.<br />
          <strong>BSSID:</strong> The MAC address of a specific access point — a hardware identifier, not a password or personal data.<br />
          <strong>Congestion score:</strong> An estimate calculated from visible networks, signal strength, and channel overlap. Not a measurement of actual airtime utilization.
        </p>
      </Section>

      <Section id="limitations" title="Known Limitations">
        <ul style={{ color: "var(--color-text-secondary)", lineHeight: 1.9, paddingLeft: "1.25rem", margin: 0 }}>
          <li>Hidden networks (not broadcasting SSIDs) are not counted in congestion estimates.</li>
          <li>Non-Wi-Fi interference (Bluetooth, microwave ovens, DECT phones) is not detected.</li>
          <li>Actual airtime utilization and client counts are not available from macOS scanning APIs.</li>
          <li>Scan results reflect conditions at the scan location and time only.</li>
          <li>The airport utility is a private framework — its behavior may change in future macOS versions.</li>
          <li>BSSID may not be available depending on macOS version and Location Services state.</li>
          <li>Channel recommendations are estimates and should not replace professional network assessment.</li>
        </ul>
      </Section>

      <Section id="accessibility" title="Accessibility">
        <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "0.5rem" }}>
          This application is designed for keyboard navigation, screen readers, and high-contrast viewing. Signal quality is never communicated by color alone — every indicator includes a text label and dBm value.
        </p>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", lineHeight: 1.7 }}>
          If you encounter an accessibility issue, please check the project documentation for known issues.
        </p>
      </Section>

      <Section id="privacy" title="Privacy Statement">
        <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
          This application is local-first. Scan data is stored only in a SQLite database on your Mac.
          No data is transmitted to a remote server by default. BSSID and SSID values are local network identifiers
          and are treated as sensitive local data. The agent does not collect Wi-Fi passwords, connect to networks,
          or modify router settings.
        </p>
      </Section>
    </div>
  );
}
