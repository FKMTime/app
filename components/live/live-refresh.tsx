"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 60_000;
const FALLBACK_AFTER_FAILURES = 3;
const REFRESH_DEBOUNCE_MS = 300;

// Mount once per public competition page. Opens an SSE connection to
// /api/sse/[wcaId] and calls router.refresh() on every "change" event
// (debounced) so the RSC tree re-renders with fresh, safely-selected
// data. Falls back to 60s polling if the SSE connection keeps failing —
// matches the plan's documented behaviour.
export function LiveRefresh({ wcaId }: { wcaId: string }) {
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null;
        router.refresh();
      }, REFRESH_DEBOUNCE_MS);
    };

    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let consecutiveFailures = 0;
    let cancelled = false;

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(scheduleRefresh, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const connect = () => {
      if (cancelled) return;
      try {
        es = new EventSource(`/api/sse/${encodeURIComponent(wcaId)}`);
      } catch {
        startPolling();
        return;
      }

      es.addEventListener("open", () => {
        consecutiveFailures = 0;
        stopPolling();
      });
      es.addEventListener("change", scheduleRefresh);
      es.addEventListener("error", () => {
        consecutiveFailures += 1;
        // EventSource auto-reconnects on its own; we only swap to polling
        // if it keeps failing in a row, signaling a real outage.
        if (consecutiveFailures >= FALLBACK_AFTER_FAILURES) {
          startPolling();
        }
      });
    };

    connect();

    return () => {
      cancelled = true;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      stopPolling();
      es?.close();
    };
  }, [wcaId, router]);

  return null;
}
