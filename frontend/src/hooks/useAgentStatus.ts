import { useCallback, useEffect, useRef, useState } from "react";
import { getHealth } from "../services/api";
import type { AgentCapabilities, HealthResponse } from "../types/wifi";

export interface AgentStatus {
  isConnected: boolean;
  isLoading: boolean;
  health: HealthResponse | null;
  error: string | null;
}

const POLL_INTERVAL_MS = 15_000;

/**
 * Polls GET /api/health every 15 seconds.
 * Provides agent connectivity, scanner availability, and interface status.
 */
export function useAgentStatus(): AgentStatus & { refresh: () => void } {
  const [status, setStatus] = useState<AgentStatus>({
    isConnected: false,
    isLoading: true,
    health: null,
    error: null,
  });

  const check = useCallback(async () => {
    try {
      const health = await getHealth();
      setStatus({ isConnected: true, isLoading: false, health, error: null });
    } catch (err: any) {
      setStatus({
        isConnected: false,
        isLoading: false,
        health: null,
        error: err?.message || "Cannot reach the local agent.",
      });
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [check]);

  return { ...status, refresh: check };
}
