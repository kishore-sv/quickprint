"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchKioskDisplayState, kioskDisplayWsUrl } from "./api";
import {
  applyDisplayEvent,
  reconcileDisplayState,
  shouldReturnToIdle,
} from "./map-kiosk-display-state";
import type { KioskDisplayEvent, KioskDisplayViewState } from "./types";
import { WS_BACKOFF_MS } from "./types";

function parseEvent(data: string): KioskDisplayEvent | null {
  try {
    const json = JSON.parse(data) as KioskDisplayEvent;
    if (json.type !== "kiosk.job.status") return null;
    return json;
  } catch {
    return null;
  }
}

export function useKioskDisplay(kioskCode: string, enabled: boolean) {
  const [view, setView] = useState<KioskDisplayViewState>({
    state: "IDLE",
    kioskCode,
    kioskName: kioskCode,
    scanUrl: "",
    jobId: null,
    updatedAt: new Date().toISOString(),
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const reconcile = useCallback(async () => {
    if (!enabled) return;
    try {
      const server = await fetchKioskDisplayState(kioskCode);
      setView((current) => reconcileDisplayState(current, server));
    } catch {
      /* keep current safe state */
    }
  }, [enabled, kioskCode]);

  const connect = useCallback(() => {
    if (!enabled || !mounted.current) return;

    const ws = new WebSocket(kioskDisplayWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempt.current = 0;
      void reconcile();
    };

    ws.onmessage = (event) => {
      const parsed = parseEvent(String(event.data));
      if (!parsed) return;
      setView((current) => applyDisplayEvent(current, parsed));
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (!mounted.current) return;
      const delay = WS_BACKOFF_MS[Math.min(reconnectAttempt.current, WS_BACKOFF_MS.length - 1)];
      reconnectAttempt.current += 1;
      reconnectTimer.current = setTimeout(() => connect(), delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [enabled, kioskCode, reconcile]);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) return;

    void reconcile().then(() => connect());

    return () => {
      mounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect, enabled, reconcile]);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      setView((current) => {
        if (shouldReturnToIdle(current.state, current.updatedAt)) {
          void reconcile();
          return { ...current, state: "IDLE", jobId: null };
        }
        return current;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [enabled, reconcile]);

  return view;
}
