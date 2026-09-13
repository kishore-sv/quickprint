"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { isPrintJobTerminal } from "@/lib/map-print-job-status";
import type { PrintJobDetail } from "@/lib/types";
const POLL_MS = 2000;

export function usePrintJobPoll(jobId: string | null) {
  const [job, setJob] = useState<PrintJobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(jobId));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!jobId) return null;
    const j = await apiFetch<PrintJobDetail>(`/print-jobs/${jobId}`);
    setJob(j);
    setError(null);
    return j;
  }, [jobId]);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function start() {
      try {
        const j = await load();
        if (cancelled) return;
        if (isPrintJobTerminal(j)) {
          setLoading(false);
          return;
        }
        timerRef.current = setInterval(() => {
          void load()
            .then((updated) => {
              if (isPrintJobTerminal(updated)) {
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
              }
            })
            .catch((e) => {
              if (!cancelled) {
                setError(e instanceof Error ? e.message : "Could not load job");
              }
            });
        }, POLL_MS);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load job");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [jobId, load]);

  return { job, error, loading, reload: load };
}
