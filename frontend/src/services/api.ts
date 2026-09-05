/**
 * Typed API client for the local Wi-Fi Signal Analyzer agent.
 * All requests go to http://127.0.0.1:8000 (loopback only).
 * Never sends data to a remote server.
 */

import type {
  AgentCapabilities,
  ChannelAnalysisResponse,
  HealthResponse,
  HistoryResponse,
  NetworkListResponse,
  NetworkObservation,
  ScanRecord,
  ScanStartResponse,
} from "../types/wifi";

const BASE_URL = "http://127.0.0.1:8000";

class APIError extends Error {
  constructor(
    public status: number,
    public errorCode: string,
    message: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...options,
    });
  } catch (err) {
    // Network error — agent likely not running
    throw new APIError(0, "AGENT_UNREACHABLE", "Cannot reach the local agent at 127.0.0.1:8000. Make sure the agent is running.");
  }

  if (!response.ok) {
    let errorCode = "UNKNOWN_ERROR";
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      const detail = body.detail || body;
      errorCode = detail.error_code || errorCode;
      message = detail.message || message;
    } catch {}
    throw new APIError(response.status, errorCode, message);
  }

  return response.json() as Promise<T>;
}

// ── Health & Capabilities ──────────────────────────────────────────────────

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}

export async function getCapabilities(): Promise<AgentCapabilities> {
  return request<AgentCapabilities>("/api/capabilities");
}

// ── Scan ───────────────────────────────────────────────────────────────────

export async function startScan(): Promise<ScanStartResponse> {
  return request<ScanStartResponse>("/api/scan", { method: "POST" });
}

export async function getLatestScan(): Promise<ScanRecord | null> {
  return request<ScanRecord | null>("/api/scans/latest");
}

// ── Networks ───────────────────────────────────────────────────────────────

export interface NetworkListParams {
  band?: string;
  quality?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export async function getNetworks(params: NetworkListParams = {}): Promise<NetworkListResponse> {
  const qs = new URLSearchParams();
  if (params.band) qs.set("band", params.band);
  if (params.quality) qs.set("quality", params.quality);
  if (params.search) qs.set("search", params.search);
  if (params.page) qs.set("page", String(params.page));
  if (params.page_size) qs.set("page_size", String(params.page_size));
  const query = qs.toString() ? `?${qs}` : "";
  return request<NetworkListResponse>(`/api/networks${query}`);
}

export async function getNetworkByBssid(bssid: string): Promise<NetworkObservation[]> {
  return request<NetworkObservation[]>(`/api/networks/${encodeURIComponent(bssid)}`);
}

// ── Channels ───────────────────────────────────────────────────────────────

export async function getChannelAnalysis(): Promise<ChannelAnalysisResponse> {
  return request<ChannelAnalysisResponse>("/api/channels");
}

// ── History ────────────────────────────────────────────────────────────────

export async function getHistory(page = 1, page_size = 20): Promise<HistoryResponse> {
  return request<HistoryResponse>(`/api/history?page=${page}&page_size=${page_size}`);
}

export async function deleteHistory(): Promise<{ deleted_scan_count: number; message: string }> {
  return request<{ deleted_scan_count: number; message: string }>(
    "/api/history?confirm=true",
    { method: "DELETE" }
  );
}

export { APIError };
