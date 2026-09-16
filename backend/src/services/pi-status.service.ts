import { randomUUID } from "crypto";
import { and, eq, inArray, isNull, not, or, sql } from "drizzle-orm";
import { db } from "../db";
import { printJobEvents, printJobs } from "../db/schema";
import type { PrintJobStatus } from "../types/enums";
import { PrintJobEventType } from "../types/enums";
import { NotFoundError, PrintJobError } from "../utils/errors";
import { classifyPiFailure } from "../utils/print-errors";
import { piMessageTypeToStatus } from "../ws/kiosk-agent.protocol";
import { markJobDispatchComplete } from "./kiosk-dispatch.service";
import {
  PI_PHASE_TO_DB_STATUS,
  dbStatusRank,
  piPhaseRank,
} from "./print-job-lifecycle";
import { cleanupJobSourceFile } from "./print-job-cleanup.service";
import { broadcastKioskDisplayUpdate } from "./kiosk-display.service";

const TERMINAL: PrintJobStatus[] = ["COMPLETED", "FAILED", "CANCELLED", "EXPIRED"];

/** Serialize Pi status updates per job so concurrent WS messages cannot clobber newer phases. */
const jobUpdateChains = new Map<string, Promise<unknown>>();

function withJobUpdateLock<T>(jobId: string, fn: () => Promise<T>): Promise<T> {
  const prev = jobUpdateChains.get(jobId) ?? Promise.resolve();
  const next = prev.then(() => fn());
  jobUpdateChains.set(jobId, next);
  void next.finally(() => {
    if (jobUpdateChains.get(jobId) === next) {
      jobUpdateChains.delete(jobId);
    }
  });
  return next;
}

/** SQL expression: numeric rank for pi_phase (matches piPhaseRank). */
const PI_PHASE_RANK_SQL = sql`CASE UPPER(${printJobs.piPhase})
  WHEN 'RECEIVED' THEN 1
  WHEN 'DOWNLOADING' THEN 2
  WHEN 'READY' THEN 3
  WHEN 'SUBMITTED' THEN 4
  WHEN 'PRINTING' THEN 5
  WHEN 'COMPLETED' THEN 6
  ELSE 0
END`;

function buildMonotonicPhaseGuard(piStatusKey: string, incomingPhaseRank: number) {
  if (piStatusKey === "FAILED") {
    return undefined;
  }
  return or(isNull(printJobs.piPhase), sql`${PI_PHASE_RANK_SQL} <= ${incomingPhaseRank}`);
}

function buildNonTerminalStatusGuard(piStatusKey: string) {
  if (piStatusKey === "FAILED") {
    return undefined;
  }
  return not(inArray(printJobs.status, TERMINAL));
}

export async function applyPiJobUpdate(
  kioskId: string,
  jobId: string,
  piStatusKey: string,
  extra?: { error?: string; cups_job_id?: string }
) {
  return withJobUpdateLock(jobId, () =>
    applyPiJobUpdateLocked(kioskId, jobId, piStatusKey, extra)
  );
}

async function applyPiJobUpdateLocked(
  kioskId: string,
  jobId: string,
  piStatusKey: string,
  extra?: { error?: string; cups_job_id?: string }
) {
  const backendStatus = PI_PHASE_TO_DB_STATUS[piStatusKey];
  if (!backendStatus) {
    throw new PrintJobError(`Unknown Pi status: ${piStatusKey}`);
  }

  const [job] = await db
    .select()
    .from(printJobs)
    .where(and(eq(printJobs.id, jobId), eq(printJobs.kioskId, kioskId)))
    .limit(1);
  if (!job) throw new NotFoundError("Job not found for kiosk");

  const current = job.status as PrintJobStatus;
  if (TERMINAL.includes(current)) {
    return job;
  }

  const now = new Date();
  const incomingPhaseRank = piPhaseRank(piStatusKey);
  const currentPhaseRank = piPhaseRank(job.piPhase);

  if (piStatusKey !== "FAILED" && incomingPhaseRank > 0 && currentPhaseRank > 0) {
    if (incomingPhaseRank < currentPhaseRank) {
      return job;
    }
  }

  const phaseOnly =
    job.piPhase?.toUpperCase() === piStatusKey &&
    current === backendStatus &&
    backendStatus !== "FAILED" &&
    backendStatus !== "COMPLETED";

  if (phaseOnly) {
    const [updated] = await db
      .update(printJobs)
      .set({ lastPiEventAt: now })
      .where(
        and(
          eq(printJobs.id, jobId),
          buildNonTerminalStatusGuard(piStatusKey),
          buildMonotonicPhaseGuard(piStatusKey, incomingPhaseRank)
        )
      )
      .returning();
    return updated ?? job;
  }

  if (current === backendStatus && job.piPhase?.toUpperCase() === piStatusKey) {
    return job;
  }

  if (
    piStatusKey !== "FAILED" &&
    dbStatusRank(backendStatus) < dbStatusRank(current)
  ) {
    return job;
  }

  const patch: Partial<typeof printJobs.$inferInsert> = {
    status: backendStatus,
    piPhase: piStatusKey,
    lastPiEventAt: now,
  };
  if (piStatusKey === "RECEIVED" && !job.claimedAt) {
    patch.claimedAt = now;
  }
  if (backendStatus === "PRINTING" && !job.printingStartedAt) {
    patch.printingStartedAt = now;
  }
  if (backendStatus === "COMPLETED") {
    patch.completedAt = now;
  }
  if (backendStatus === "FAILED") {
    patch.failedAt = now;
    patch.failureReason = extra?.error?.slice(0, 512) ?? "Print failed";
    patch.userErrorCode = classifyPiFailure(extra?.error);
  }
  if (extra?.cups_job_id) {
    patch.printerJobId = extra.cups_job_id;
  }

  const updateGuard = and(
    eq(printJobs.id, jobId),
    buildNonTerminalStatusGuard(piStatusKey),
    buildMonotonicPhaseGuard(piStatusKey, incomingPhaseRank)
  );

  const [updated] = await db
    .update(printJobs)
    .set(patch)
    .where(updateGuard)
    .returning();

  if (!updated) {
    const [fresh] = await db
      .select()
      .from(printJobs)
      .where(eq(printJobs.id, jobId))
      .limit(1);
    return fresh ?? job;
  }

  const eventType =
    backendStatus === "PRINTING"
      ? PrintJobEventType.PRINTING_STARTED
      : backendStatus === "COMPLETED"
        ? PrintJobEventType.PRINT_COMPLETED
        : backendStatus === "FAILED"
          ? PrintJobEventType.PRINT_FAILED
          : null;

  if (eventType) {
    await db.insert(printJobEvents).values({
      id: randomUUID(),
      printJobId: jobId,
      eventType,
      metadata: extra ?? null,
    });
  }

  if (backendStatus === "COMPLETED") {
    await cleanupJobSourceFile(jobId);
    await markJobDispatchComplete(kioskId, jobId);
  } else if (TERMINAL.includes(backendStatus)) {
    await markJobDispatchComplete(kioskId, jobId);
  }

  void broadcastKioskDisplayUpdate(kioskId, updated);

  return updated;
}

export async function applyPiOutboundMessage(
  kioskId: string,
  messageType: string,
  jobId: string | undefined,
  fields: Record<string, unknown>
) {
  if (messageType === "agent.heartbeat") {
    return;
  }
  if (!jobId) return;

  const piKey = piMessageTypeToStatus(messageType);
  if (!piKey) return;

  await applyPiJobUpdate(kioskId, jobId, piKey, {
    error:
      typeof fields.error === "string"
        ? fields.error
        : typeof fields.message === "string"
          ? fields.message
          : undefined,
    cups_job_id: typeof fields.cups_job_id === "string" ? fields.cups_job_id : undefined,
  });
}

/** @internal Test helper — reset per-job update chains between tests. */
export function resetPiJobUpdateLocks(): void {
  jobUpdateChains.clear();
}
