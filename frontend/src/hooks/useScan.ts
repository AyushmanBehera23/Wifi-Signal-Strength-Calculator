import { useCallback, useRef, useState } from "react";
import { APIError, getLatestScan, startScan } from "../services/api";
import type { ScanRecord } from "../types/wifi";

export type ScanState = "idle" | "scanning" | "success" | "error";

export interface ScanStatus {
  state: ScanState;
  scanId: string | null;
  latestScan: ScanRecord | null;
  error: string | null;
  errorCode: string | null;
  lastScanTime: Date | null;
}

/**
 * Manages the scan lifecycle: idle → scanning → success/error.
 * Prevents duplicate scans. Never erases the last successful result on failure.
 */
export function useScan() {
  const [status, setStatus] = useState<ScanStatus>({
    state: "idle",
    scanId: null,
    latestScan: null,
    error: null,
    errorCode: null,
    lastScanTime: null,
  });

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollForResult = useCallback(
    (scanId: string) => {
      let attempts = 0;
      const MAX_ATTEMPTS = 40; // 40 × 500ms = 20s max
      pollingRef.current = setInterval(async () => {
        attempts++;
        try {
          const latest = await getLatestScan();
          if (latest?.scan_id === scanId && latest.status === "complete") {
            stopPolling();
            setStatus((prev) => ({
              ...prev,
              state: "success",
              latestScan: latest,
              lastScanTime: new Date(latest.completed_at || latest.started_at),
            }));
          } else if (latest?.scan_id === scanId && latest.status === "error") {
            stopPolling();
            setStatus((prev) => ({
              ...prev,
              state: "error",
              error: latest.error_message || "Scan failed.",
              errorCode: latest.error_code,
            }));
          }
        } catch {}
        if (attempts >= MAX_ATTEMPTS) {
          stopPolling();
          setStatus((prev) => ({
            ...prev,
            state: "error",
            error: "Scan timed out. The scanner may be unavailable.",
            errorCode: "SCAN_TIMEOUT",
          }));
        }
      }, 500);
    },
    [stopPolling]
  );

  const triggerScan = useCallback(async () => {
    if (status.state === "scanning") return;

    setStatus((prev) => ({
      ...prev,
      state: "scanning",
      error: null,
      errorCode: null,
    }));

    try {
      const { scan_id } = await startScan();
      setStatus((prev) => ({ ...prev, scanId: scan_id }));
      pollForResult(scan_id);
    } catch (err: any) {
      const code = err instanceof APIError ? err.errorCode : "UNKNOWN_ERROR";
      setStatus((prev) => ({
        ...prev,
        state: "error",
        error: err.message || "Failed to start scan.",
        errorCode: code,
        // Preserve previous successful scan result
      }));
    }
  }, [status.state, pollForResult]);

  const loadLatest = useCallback(async () => {
    try {
      const latest = await getLatestScan();
      if (latest) {
        setStatus((prev) => ({
          ...prev,
          state: "success",
          latestScan: latest,
          lastScanTime: new Date(latest.completed_at || latest.started_at),
        }));
      }
    } catch {}
  }, []);

  return { ...status, triggerScan, loadLatest };
}
