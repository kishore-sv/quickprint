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
  const cancelledRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const load = useCallback(async () => {
    if (!jobId) return null;
    const j = await apiFetch<PrintJobDetail>(`/print-jobs/${jobId}`);
    setJob(j);
    setError(null);
    return j;
  }, [jobId]);

  const startPolling = useCallback(async () => {
    stopPolling();
    const j = await load();
    if (cancelledRef.current || isPrintJobTerminal(j)) {
      return j;
    }
    timerRef.current = setInterval(() => {
      void load()
        .then((updated) => {
          if (isPrintJobTerminal(updated)) {
            stopPolling();
          }
        })
        .catch((e) => {
          if (!cancelledRef.current) {
            setError(e instanceof Error ? e.message : "Could not load job");
          }
        });
    }, POLL_MS);
    return j;
  }, [load, stopPolling]);

  const resumePolling = useCallback(async () => {
    setLoading(true);
    try {
      return await startPolling();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load job");
      throw e;
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [startPolling]);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setLoading(false);
      return;
    }

    cancelledRef.current = false;
    setLoading(true);

    void startPolling()
      .catch((e) => {
        if (!cancelledRef.current) {
          setError(e instanceof Error ? e.message : "Could not load job");
        }
      })
      .finally(() => {
        if (!cancelledRef.current) setLoading(false);
      });

    return () => {
      cancelledRef.current = true;
      stopPolling();
    };
  }, [jobId, startPolling, stopPolling]);

  return { job, error, loading, reload: load, resumePolling };
}
