import { useEffect, useRef } from "react";
import { boardSocketUrl } from "../api/client";
import { demoApi } from "../demo/demoStore";

export interface SocketEvent {
  event: "task.created" | "task.updated" | "task.moved" | "task.deleted";
  data: unknown;
}

/**
 * Subscribe to a board's real-time event stream. The handler fires for every
 * task.* event broadcast by the server, so all connected members stay in sync.
 * Includes a simple auto-reconnect with backoff.
 *
 * In demo mode (no backend) there is no WebSocket, so this is a no-op.
 */
export function useBoardSocket(
  boardId: number | null,
  onEvent: (evt: SocketEvent) => void
) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (boardId == null || demoApi.isEnabled()) return;

    let ws: WebSocket | null = null;
    let closed = false;
    let retry = 0;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    const connect = () => {
      ws = new WebSocket(boardSocketUrl(boardId));

      ws.onopen = () => {
        retry = 0;
        // Keep the connection warm on free-tier hosting.
        pingTimer = setInterval(() => ws?.readyState === WebSocket.OPEN && ws.send("ping"), 25000);
      };

      ws.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data) as SocketEvent;
          handlerRef.current(parsed);
        } catch {
          /* ignore non-JSON (ping echoes) */
        }
      };

      ws.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        if (!closed) {
          retry += 1;
          const delay = Math.min(1000 * 2 ** retry, 10000);
          setTimeout(connect, delay);
        }
      };

      ws.onerror = () => ws?.close();
    };

    connect();

    return () => {
      closed = true;
      if (pingTimer) clearInterval(pingTimer);
      ws?.close();
    };
  }, [boardId]);
}
