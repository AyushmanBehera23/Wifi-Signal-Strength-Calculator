import { useEffect, useRef, useState } from "react";
import type { ConnectionState } from "../services/websocket";
import { wsClient } from "../services/websocket";
import type { WSEvent } from "../types/wifi";

export interface WSStatus {
  connectionState: ConnectionState;
  lastEvent: WSEvent | null;
}

/**
 * Subscribes to all WebSocket events from the local agent.
 * Connects on mount, disconnects on unmount.
 */
export function useWebSocket(): WSStatus {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    wsClient.getState()
  );
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);

  useEffect(() => {
    wsClient.connect();

    const unsubConn = wsClient.onConnectionChange(setConnectionState);
    const unsubEvent = wsClient.on("*", setLastEvent);

    return () => {
      unsubConn();
      unsubEvent();
      // Don't close the singleton — other components may still use it
    };
  }, []);

  return { connectionState, lastEvent };
}
