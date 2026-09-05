import type { SignalQuality } from "../../types/wifi";

interface SignalBadgeProps {
  quality: SignalQuality;
  dbm: number | null;
  showDbm?: boolean;
}

const qualityConfig: Record<
  SignalQuality,
  { label: string; cssClass: string; icon: string }
> = {
  Excellent:   { label: "Excellent",  cssClass: "signal-bg-excellent", icon: "▲▲▲▲▲" },
  Good:        { label: "Good",       cssClass: "signal-bg-good",      icon: "▲▲▲▲△" },
  Fair:        { label: "Fair",       cssClass: "signal-bg-fair",      icon: "▲▲▲△△" },
  Weak:        { label: "Weak",       cssClass: "signal-bg-weak",      icon: "▲▲△△△" },
  "Very weak": { label: "Very weak",  cssClass: "signal-bg-very-weak", icon: "▲△△△△" },
  Unknown:     { label: "Unknown",    cssClass: "signal-bg-unknown",   icon: "?△△△△" },
};

export function SignalBadge({ quality, dbm, showDbm = true }: SignalBadgeProps) {
  const cfg = qualityConfig[quality] || qualityConfig.Unknown;
  const title = `RSSI: ${dbm != null ? `${dbm} dBm` : "Not reported"} — ${cfg.label}. Signal strength is measured at the scan location and does not guarantee throughput.`;

  return (
    <span
      className={`badge ${cfg.cssClass}`}
      title={title}
      aria-label={`Signal quality: ${cfg.label}${dbm != null ? `, ${dbm} dBm` : ""}`}
    >
      <span aria-hidden="true" style={{ fontSize: "0.6rem", letterSpacing: "-2px" }}>
        {cfg.icon}
      </span>
      {showDbm && dbm != null && (
        <span className="mono" style={{ color: "inherit" }}>
          {dbm} dBm
        </span>
      )}
      <span>{cfg.label}</span>
    </span>
  );
}
