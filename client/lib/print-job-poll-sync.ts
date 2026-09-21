import { isPrintJobTerminal } from "@/lib/map-print-job-status";
import type { PrintJobDetail } from "@/lib/types";

export const PRINT_JOB_POLL_MS = 2000;

/**
 * Whether an incoming poll response should replace the current job snapshot.
 * Uses monotonic request sequence plus terminal-state guards.
 */
export function shouldApplyPrintJobUpdate(
  current: PrintJobDetail | null,
  incoming: PrintJobDetail,
  requestSeq: number,
  lastAppliedSeq: number
): boolean {
  if (requestSeq < lastAppliedSeq) {
    return false;
  }
  if (current && isPrintJobTerminal(current) && !isPrintJobTerminal(incoming)) {
    return false;
  }
  return true;
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export type SerializedPrintJobPollParams = {
  generation: number;
  getGeneration: () => number;
  shouldStop: () => boolean;
  fetchJob: () => Promise<PrintJobDetail>;
  getCurrentJob: () => PrintJobDetail | null;
  getLastAppliedSeq: () => number;
  setLastAppliedSeq: (seq: number) => void;
  onJob: (job: PrintJobDetail, requestSeq: number) => void;
  onPollError: (message: string) => void;
  onInitialError: (message: string) => void;
  clearPollError: () => void;
  pollMs: number;
};

/**
 * Serialized poll loop: one in-flight GET at a time, wait pollMs between successful cycles.
 */
export async function runSerializedPrintJobPoll(
  params: SerializedPrintJobPollParams
): Promise<PrintJobDetail | null> {
  let requestSeq = 0;

  const processFetch = async (): Promise<PrintJobDetail | null> => {
    const seq = ++requestSeq;
    try {
      const incoming = await params.fetchJob();
      if (params.shouldStop() || params.generation !== params.getGeneration()) {
        return null;
      }
      const current = params.getCurrentJob();
      if (shouldApplyPrintJobUpdate(current, incoming, seq, params.getLastAppliedSeq())) {
        params.setLastAppliedSeq(seq);
        params.onJob(incoming, seq);
        params.clearPollError();
      }
      return incoming;
    } catch (e) {
      if (params.generation !== params.getGeneration()) {
        return null;
      }
      if (params.shouldStop()) {
        return null;
      }
      const message = e instanceof Error ? e.message : "Could not load job";
      if (params.getCurrentJob()) {
        params.onPollError(message);
      } else {
        params.onInitialError(message);
      }
      return null;
    }
  };

  const first = await processFetch();
  if (params.shouldStop() || params.generation !== params.getGeneration()) {
    return params.getCurrentJob();
  }
  if (first && isPrintJobTerminal(first)) {
    return first;
  }

  while (!params.shouldStop() && params.generation === params.getGeneration()) {
    await sleepMs(params.pollMs);
    if (params.shouldStop() || params.generation !== params.getGeneration()) {
      break;
    }
    const updated = await processFetch();
    if (params.shouldStop() || params.generation !== params.getGeneration()) {
      break;
    }
    if (updated && isPrintJobTerminal(updated)) {
      break;
    }
  }

  return params.getCurrentJob();
}
