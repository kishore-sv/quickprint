"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPrintJobDetail } from "@/lib/api";
import {
  PRINT_JOB_POLL_MS,
  runSerializedPrintJobPoll,
  shouldApplyPrintJobUpdate,
} from "@/lib/print-job-poll-sync";
import type { PrintJobDetail } from "@/lib/types";

export function usePrintJobPoll(jobId: string | null) {
  const [job, setJob] = useState<PrintJobDetail | null>(null);
  /** Fatal error when no job has been loaded yet (initial load). */
  const [error, setError] = useState<string | null>(null);
  /** Non-blocking warning when a background poll fails but last job is shown. */
  const [pollWarning, setPollWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(jobId));

  const generationRef = useRef(0);
  const stoppedRef = useRef(true);
  const jobRef = useRef<PrintJobDetail | null>(null);
  const lastAppliedSeqRef = useRef(0);
  const fetchTailRef = useRef<Promise<void>>(Promise.resolve());

  const invalidatePolling = useCallback(() => {
    stoppedRef.current = true;
    generationRef.current += 1;
  }, []);

  const serializedFetch = useCallback((id: string): Promise<PrintJobDetail> => {
    const run = () => fetchPrintJobDetail(id);
    const next = fetchTailRef.current.then(run, run);
    fetchTailRef.current = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }, []);

  const commitJob = useCallback((incoming: PrintJobDetail, requestSeq: number) => {
    const current = jobRef.current;
    if (!shouldApplyPrintJobUpdate(current, incoming, requestSeq, lastAppliedSeqRef.current)) {
      return;
    }
    lastAppliedSeqRef.current = requestSeq;
    jobRef.current = incoming;
    setJob(incoming);
    setError(null);
    setPollWarning(null);
  }, []);

  const runLoop = useCallback(
    async (id: string, generation: number): Promise<PrintJobDetail | null> => {
      stoppedRef.current = false;
      lastAppliedSeqRef.current = 0;

      return runSerializedPrintJobPoll({
        generation,
        getGeneration: () => generationRef.current,
        shouldStop: () => stoppedRef.current,
        pollMs: PRINT_JOB_POLL_MS,
        fetchJob: () => serializedFetch(id),
        getCurrentJob: () => jobRef.current,
        getLastAppliedSeq: () => lastAppliedSeqRef.current,
        setLastAppliedSeq: (seq) => {
          lastAppliedSeqRef.current = seq;
        },
        onJob: (incoming, requestSeq) => {
          commitJob(incoming, requestSeq);
        },
        clearPollError: () => setPollWarning(null),
        onPollError: (message) => setPollWarning(message),
        onInitialError: (message) => setError(message),
      });
    },
    [commitJob, serializedFetch]
  );

  const startPolling = useCallback(
    async (resetJob: boolean) => {
      if (!jobId) return null;
      invalidatePolling();
      const generation = ++generationRef.current;

      if (resetJob) {
        jobRef.current = null;
        lastAppliedSeqRef.current = 0;
        setJob(null);
        setError(null);
        setPollWarning(null);
      }

      return runLoop(jobId, generation);
    },
    [invalidatePolling, jobId, runLoop]
  );

  const reload = useCallback(async (): Promise<PrintJobDetail | null> => {
    if (!jobId) return null;
    const generation = generationRef.current;
    let requestSeq = 0;
    try {
      const incoming = await serializedFetch(jobId);
      if (generation !== generationRef.current) {
        return jobRef.current;
      }
      requestSeq = lastAppliedSeqRef.current + 1;
      commitJob(incoming, requestSeq);
      return incoming;
    } catch (e) {
      if (generation !== generationRef.current) {
        return jobRef.current;
      }
      const message = e instanceof Error ? e.message : "Could not load job";
      if (jobRef.current) {
        setPollWarning(message);
      } else {
        setError(message);
      }
      return jobRef.current;
    }
  }, [commitJob, jobId, serializedFetch]);

  const resumePolling = useCallback(async () => {
    if (!jobId) return null;
    setLoading(true);
    try {
      return await startPolling(false);
    } finally {
      setLoading(false);
    }
  }, [jobId, startPolling]);

  useEffect(() => {
    if (!jobId) {
      invalidatePolling();
      jobRef.current = null;
      void Promise.resolve().then(() => {
        setJob(null);
        setError(null);
        setPollWarning(null);
        setLoading(false);
      });
      return () => {
        invalidatePolling();
      };
    }

    let active = true;
    void (async () => {
      setLoading(true);
      try {
        await startPolling(true);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      invalidatePolling();
    };
  }, [jobId, invalidatePolling, startPolling]);

  return { job, error, pollWarning, loading, reload, resumePolling };
}
