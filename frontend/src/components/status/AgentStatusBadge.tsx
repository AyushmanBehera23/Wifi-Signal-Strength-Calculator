import type { HealthResponse } from "../../types/wifi";

interface AgentStatusBadgeProps {
  health: HealthResponse | null;
  isConnected: boolean;
  isLoading: boolean;
}

export function AgentStatusBadge({ health, isConnected, isLoading }: AgentStatusBadgeProps) {
  if (isLoading) {
    return (
      <span className="badge" style={{ background: "var(--color-navy-700)", gap: "0.375rem" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-text-muted)", display: "inline-block" }} />
        Checking agent…
      </span>
    );
  }

  if (!isConnected || !health) {
    return (
      <span className="badge" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
        <span
          style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse-dot 2s infinite" }}
          aria-hidden="true"
        />
        <span>Agent offline</span>
      </span>
    );
  }

  const isOk = health.status === "ok";
  const color = isOk ? "var(--color-signal-excellent)" : "var(--color-signal-fair)";
  const bg = isOk ? "rgba(34,197,94,0.12)" : "rgba(250,204,21,0.12)";
  const border = isOk ? "rgba(34,197,94,0.3)" : "rgba(250,204,21,0.3)";
  const label = isOk ? "Agent ready" : "Agent degraded";

  return (
    <span
      className="badge"
      style={{ background: bg, border: `1px solid ${border}`, color, gap: "0.375rem" }}
      title={`Scanner: ${health.scanner_source ?? "none"} | Interface: ${health.interface_available ? "available" : "unavailable"} | macOS: ${health.macos_version ?? "unknown"}`}
      aria-label={`${label}. Scanner source: ${health.scanner_source ?? "none"}.`}
    >
      <span
        style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", animation: isOk ? "pulse-dot 3s infinite" : "none" }}
        aria-hidden="true"
      />
      {label}
      {health.macos_version && (
        <span style={{ color: "var(--color-text-muted)", fontSize: "0.7rem" }}>· macOS {health.macos_version}</span>
      )}
    </span>
  );
}
