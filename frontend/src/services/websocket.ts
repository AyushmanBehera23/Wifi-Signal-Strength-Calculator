/**
 * WebSocket client for the local agent's /ws endpoint.
 * Features:
 *   - Exponential back-off reconnect (max 30s)
 *   - Typed event emission via callbacks
 *   - Connection state tracking
 *   - Never reconnects after explicit close()
 */

import type { WSEvent, WSEventType } from "../types/wifi";

type EventCallback = (event: WSEvent) => void;
type ConnectionCallback = (state: ConnectionState) => void;

export type ConnectionState = "connecting" | "connected" | "disconnected" | "closed";

const WS_URL = "ws://127.0.0.1:8000/ws";
const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

class WiFiWebSocket {
  private ws: WebSocket | null = null;
  private listeners: Map<WSEventType | "*", Set<EventCallback>> = new Map();
  private connectionListeners: Set<ConnectionCallback> = new Set();
  private state: ConnectionState = "disconnected";
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.intentionallyClosed = false;
    this._connect();
  }

  private _connect(): void {
    if (this.intentionallyClosed) return;
    this._setState("connecting");

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.retryCount = 0;
        this._setState("connected");
      };

      this.ws.onmessage = (evt) => {
        try {
          const event: WSEvent = JSON.parse(evt.data as string);
          this._emit(event);
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (!this.intentionallyClosed) {
          this._setState("disconnected");
          this._scheduleReconnect();
        } else {
          this._setState("closed");
        }
      };

      this.ws.onerror = () => {
        // onclose fires after onerror; no additional handling needed here
      };
    } catch {
      this._setState("disconnected");
      this._scheduleReconnect();
    }
  }

  private _scheduleReconnect(): void {
    if (this.intentionallyClosed) return;
    const backoff = Math.min(BASE_BACKOFF_MS * 2 ** this.retryCount, MAX_BACKOFF_MS);
    this.retryCount++;
    this.retryTimer = setTimeout(() => this._connect(), backoff);
  }

  close(): void {
    this.intentionallyClosed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.ws?.close();
    this._setState("closed");
  }

  on(event: WSEventType | "*", callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  getState(): ConnectionState {
    return this.state;
  }

  private _setState(state: ConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    this.connectionListeners.forEach((cb) => cb(state));
  }

  private _emit(event: WSEvent): void {
    this.listeners.get(event.event)?.forEach((cb) => cb(event));
    this.listeners.get("*")?.forEach((cb) => cb(event));
  }
}

// Singleton instance
export const wsClient = new WiFiWebSocket();
