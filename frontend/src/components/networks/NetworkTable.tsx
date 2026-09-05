import { useEffect, useMemo, useRef, useState } from "react";
import type { Band, NetworkObservation, SignalQuality } from "../../types/wifi";
import { NetworkDetailsDrawer } from "./NetworkDetailsDrawer";
import { SignalBadge } from "./SignalBadge";

type SortKey = "ssid" | "signal_dbm" | "band" | "channel" | "security";
type SortDir = "asc" | "desc";

interface NetworkTableProps {
  networks: NetworkObservation[];
}

const BANDS: Band[] = ["2.4 GHz", "5 GHz", "6 GHz"];
const QUALITIES: SignalQuality[] = ["Excellent", "Good", "Fair", "Weak", "Very weak"];

function TruncatedCell({ value, mono = false }: { value: string | null; mono?: boolean }) {
  if (!value) return <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>—</span>;
  const long = value.length > 24;
  return (
    <span
      title={long ? value : undefined}
      data-tooltip={long ? value : undefined}
      style={{
        maxWidth: "12rem",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        display: "inline-block",
        fontFamily: mono ? "var(--font-family-mono)" : "inherit",
        fontSize: mono ? "0.8125rem" : "inherit",
        verticalAlign: "bottom",
      }}
    >
      {value}
    </span>
  );
}

export function NetworkTable({ networks }: NetworkTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("signal_dbm");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [bandFilter, setBandFilter] = useState<Band | "">("");
  const [qualityFilter, setQualityFilter] = useState<SignalQuality | "">("");
  const [selected, setSelected] = useState<NetworkObservation | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: '/' focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const filtered = useMemo(() => {
    let result = networks;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) =>
          (n.ssid && n.ssid.toLowerCase().includes(q)) ||
          (n.bssid && n.bssid.toLowerCase().includes(q))
      );
    }
    if (bandFilter) result = result.filter((n) => n.band === bandFilter);
    if (qualityFilter) result = result.filter((n) => n.signal_quality === qualityFilter);
    return result;
  }, [networks, search, bandFilter, qualityFilter]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "signal_dbm") {
        const av = a.signal_dbm ?? -200;
        const bv = b.signal_dbm ?? -200;
        return dir * (av - bv);
      }
      if (sortKey === "channel") {
        const av = a.channel ?? 9999;
        const bv = b.channel ?? 9999;
        return dir * (av - bv);
      }
      const av = (a[sortKey] ?? "") as string;
      const bv = (b[sortKey] ?? "") as string;
      return dir * av.localeCompare(bv);
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "signal_dbm" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (col !== sortKey) return <span style={{ opacity: 0.3 }}>↕</span>;
    return <span>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "12rem" }}>
          <input
            ref={searchRef}
            className="input"
            type="search"
            placeholder="Search SSID or BSSID  (Press / to focus)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search networks by SSID or BSSID"
          />
        </div>
        <select
          className="input"
          style={{ width: "auto", minWidth: "8rem" }}
          value={bandFilter}
          onChange={(e) => setBandFilter(e.target.value as Band | "")}
          aria-label="Filter by band"
        >
          <option value="">All bands</option>
          {BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select
          className="input"
          style={{ width: "auto", minWidth: "10rem" }}
          value={qualityFilter}
          onChange={(e) => setQualityFilter(e.target.value as SignalQuality | "")}
          aria-label="Filter by signal quality"
        >
          <option value="">All quality</option>
          {QUALITIES.map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
        <span style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", alignSelf: "center", flexShrink: 0 }}>
          {sorted.length} of {networks.length} network{networks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", borderRadius: "0.875rem", border: "1px solid var(--color-border-subtle)" }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
            <p style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>No networks match your filters</p>
            <button className="btn btn-ghost" onClick={() => { setSearch(""); setBandFilter(""); setQualityFilter(""); }}>Clear filters</button>
          </div>
        ) : (
          <table className="data-table" aria-label="Nearby Wi-Fi networks">
            <thead>
              <tr>
                <th scope="col" onClick={() => handleSort("ssid")} tabIndex={0} onKeyDown={e => e.key === "Enter" && handleSort("ssid")}>
                  SSID <SortIcon col="ssid" />
                </th>
                <th scope="col">BSSID</th>
                <th scope="col" onClick={() => handleSort("band")} tabIndex={0} onKeyDown={e => e.key === "Enter" && handleSort("band")}>
                  Band <SortIcon col="band" />
                </th>
                <th scope="col" onClick={() => handleSort("channel")} tabIndex={0} onKeyDown={e => e.key === "Enter" && handleSort("channel")}>
                  Channel <SortIcon col="channel" />
                </th>
                <th scope="col" onClick={() => handleSort("signal_dbm")} tabIndex={0} onKeyDown={e => e.key === "Enter" && handleSort("signal_dbm")}>
                  Signal <SortIcon col="signal_dbm" />
                </th>
                <th scope="col" onClick={() => handleSort("security")} tabIndex={0} onKeyDown={e => e.key === "Enter" && handleSort("security")}>
                  Security <SortIcon col="security" />
                </th>
                <th scope="col">Width</th>
                <th scope="col">Standard</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((net, idx) => {
                const key = net.bssid ?? `${net.ssid}-${idx}`;
                const isSelected = selected?.bssid === net.bssid && selected?.ssid === net.ssid;
                return (
                  <tr
                    key={key}
                    className={isSelected ? "selected" : ""}
                    onClick={() => setSelected(net)}
                    onKeyDown={e => e.key === "Enter" && setSelected(net)}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    aria-label={`Network: ${net.ssid ?? "Hidden"}, ${net.band}, ${net.signal_dbm ?? "?"} dBm`}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <TruncatedCell value={net.ssid ?? "(Hidden)"} />
                    </td>
                    <td><TruncatedCell value={net.bssid} mono /></td>
                    <td>
                      <span className="badge" style={{ background: "var(--color-navy-700)", fontSize: "0.75rem" }}>
                        {net.band}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: "0.875rem" }}>{net.channel ?? "—"}</td>
                    <td><SignalBadge quality={net.signal_quality} dbm={net.signal_dbm} /></td>
                    <td style={{ color: "var(--color-text-secondary)", fontSize: "0.8125rem" }}>
                      {net.security ?? <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>—</span>}
                    </td>
                    <td className="mono" style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                      {net.channel_width_mhz != null ? `${net.channel_width_mhz} MHz` : "—"}
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                      {net.wifi_standard ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Details drawer */}
      {selected && (
        <NetworkDetailsDrawer
          network={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
