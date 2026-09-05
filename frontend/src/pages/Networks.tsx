import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { NetworkTable } from "../components/networks/NetworkTable";
import { getLatestScan } from "../services/api";
import type { NetworkObservation } from "../types/wifi";

export function Networks() {
  const [networks, setNetworks] = useState<NetworkObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanTime, setScanTime] = useState<string | null>(null);

  useEffect(() => {
    getLatestScan().then(scan => {
      setNetworks(scan?.networks ?? []);
      setScanTime(scan?.completed_at ?? null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700 }}>Nearby Networks</h1>
          {scanTime && <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>Scan: {new Date(scanTime).toLocaleString()}</p>}
        </div>
        <Link to="/dashboard" className="btn btn-secondary">← Dashboard</Link>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 300 }} aria-label="Loading networks" />
      ) : networks.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem" }}>
          <p style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>No scan data</p>
          <p style={{ color: "var(--color-text-secondary)", margin: "0 0 1.5rem" }}>Run a scan from the dashboard first.</p>
          <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
        </div>
      ) : (
        <div className="card">
          <NetworkTable networks={networks} />
        </div>
      )}
    </div>
  );
}
