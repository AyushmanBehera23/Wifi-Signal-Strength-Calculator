// TypeScript mirror of backend Pydantic schemas (wifi.py + api.py)
// All nullable fields are typed as | null, never as 0 or ""

export type Band = "2.4 GHz" | "5 GHz" | "6 GHz" | "Unknown";

export type SignalQuality =
  | "Excellent"
  | "Good"
  | "Fair"
  | "Weak"
  | "Very weak"
  | "Unknown";

export type DataQuality = "complete" | "partial" | "minimal";

export interface NetworkObservation {
  ssid: string | null;
  bssid: string | null;
  frequency_mhz: number | null;
  band: Band;
  channel: number | null;
  signal_dbm: number | null;
  signal_quality: SignalQuality;
  security: string | null;
  channel_width_mhz: number | null;
  wifi_standard: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  data_quality: DataQuality;
  scanner_source: string | null;
}

export interface ScanRecord {
  scan_id: string;
  started_at: string;
  completed_at: string | null;
  interface: string | null;
  scanner_source: string;
  analysis_version: string;
  network_count: number;
  status: "pending" | "running" | "complete" | "error";
  error_code: string | null;
  error_message: string | null;
  networks: NetworkObservation[];
}

export interface ChannelOccupancy {
  channel: number;
  band: Band;
  frequency_mhz: number | null;
  network_count: number;
  avg_signal_dbm: number | null;
  max_signal_dbm: number | null;
  estimated_congestion: number; // 0.0 = clear, 1.0 = very congested
  overlapping_network_count: number;
  networks: string[];
}

export interface ChannelRecommendation {
  band: Band;
  recommended_channel: number | null;
  congestion_score: number;
  reasoning: string;
  methodology_summary: string;
  limitations: string[];
  analysis_version: string;
  alternatives: number[];
}

export interface AgentCapabilities {
  scanner_source: string;
  macos_version: string | null;
  interface_name: string | null;
  interface_available: boolean;
  location_permission: string | null;
  supported_fields: string[];
  supported_bands: Band[];
  notes: string[];
}

// API Response types
export interface HealthResponse {
  status: "ok" | "degraded" | "unavailable";
  version: string;
  agent_start_time: string;
  scanner_available: boolean;
  interface_available: boolean;
  scanner_source: string | null;
  macos_version: string | null;
}

export interface ScanStartResponse {
  scan_id: string;
  started_at: string;
  message: string;
}

export interface NetworkListResponse {
  networks: NetworkObservation[];
  total: number;
  page: number;
  page_size: number;
  scan_id: string | null;
  scan_timestamp: string | null;
}

export interface ChannelAnalysisResponse {
  band_24: ChannelOccupancy[];
  band_5: ChannelOccupancy[];
  band_6: ChannelOccupancy[];
  recommendations: ChannelRecommendation[];
  analysis_version: string;
  estimated: boolean;
  limitation_notice: string;
}

export interface HistoryRecord {
  scan_id: string;
  started_at: string;
  completed_at: string | null;
  network_count: number;
  scanner_source: string;
  analysis_version: string;
}

export interface HistoryResponse {
  records: HistoryRecord[];
  total: number;
  page: number;
  page_size: number;
}

// WebSocket event types
export type WSEventType =
  | "agent_status"
  | "scan_started"
  | "scan_progress"
  | "scan_complete"
  | "scan_error";

export interface WSEvent {
  event: WSEventType;
  timestamp: string;
  scan_id: string | null;
  data: Record<string, unknown>;
  error_code: string | null;
}
