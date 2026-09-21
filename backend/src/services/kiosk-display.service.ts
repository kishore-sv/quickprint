import { and, desc, eq, inArray, or } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../db";
import { kiosks, printJobs } from "../db/schema";
import { buildKioskScanUrl } from "../utils/kiosk-scan-url";
import { applyJobTimeoutIfNeeded } from "./job-timeout.service";
import { resolveDisplayStatus } from "./print-job-display.service";
import { getKioskDisplayRegistry } from "../ws/kiosk-display.registry";
import type { KioskDisplayPrinterSnapshot } from "../types/printer-telemetry";
import {
  resolvePrinterTelemetryByKioskId,
  toKioskDisplayPrinterSnapshot,
} from "./printer-telemetry.service";

export type { KioskDisplayPrinterSnapshot };

export const KIOSK_DISPLAY_COMPLETED_TTL_MS = 5300;
export const KIOSK_DISPLAY_FAILED_TTL_MS = 7000;

export type KioskDisplayState =
  | "IDLE"
  | "RECEIVED"
  | "PREPARED"
  | "PRINTING"
  | "COMPLETED"
  | "FAILED";

export type KioskJobDisplayStatus =
  | "RECEIVED"
  | "PREPARED"
  | "PRINTING"
  | "COMPLETED"
  | "FAILED";

export type KioskDisplayEvent = {
  type: "kiosk.job.status";
  kioskCode: string;
  jobId: string;
  status: KioskJobDisplayStatus;
  updatedAt: string;
};

export type KioskDisplayStateResponse = {
  kioskCode: string;
  kioskName: string;
  scanUrl: string;
  state: KioskDisplayState;
  jobId: string | null;
  updatedAt: string;
  printer: KioskDisplayPrinterSnapshot;
};

type JobRow = InferSelectModel<typeof printJobs>;

const ACTIVE_DB_STATUSES = new Set(["CLAIMED", "DOWNLOADING", "PRINTING"]);
const ACTIVE_PI_PHASES = new Set([
  "RECEIVED",
  "DOWNLOADING",
  "READY",
  "SUBMITTED",
  "PRINTING",
]);

function activityAnchor(job: JobRow): Date | null {
  return job.lastPiEventAt ?? job.dispatchedAt ?? job.claimedAt ?? null;
}

function isWithinActiveWindow(job: JobRow, now: Date): boolean {
  const anchor = activityAnchor(job);
  if (!anchor) return false;
  const timeoutMs = env.JOB_STUCK_TIMEOUT_MINUTES * 60 * 1000;
  return now.getTime() - anchor.getTime() <= timeoutMs;
}

function terminalPhaseTimestamp(job: JobRow): Date | null {
  const phase = job.piPhase?.toUpperCase() ?? null;
  if (phase === "COMPLETED") return job.completedAt ?? job.lastPiEventAt;
  if (phase === "FAILED") return job.failedAt ?? job.lastPiEventAt;
  return null;
}

function isTerminalPhaseWithinGrace(job: JobRow, now: Date): boolean {
  const phase = job.piPhase?.toUpperCase() ?? null;
  const ts = terminalPhaseTimestamp(job);
  if (!ts) return false;
  const ttl =
    phase === "COMPLETED" ? KIOSK_DISPLAY_COMPLETED_TTL_MS : KIOSK_DISPLAY_FAILED_TTL_MS;
  return now.getTime() - ts.getTime() <= ttl;
}

export function isKioskDisplayActiveJob(job: JobRow, now = new Date()): boolean {
  if (job.status === "COMPLETED" || job.status === "FAILED" || job.status === "CANCELLED") {
    return isTerminalWithinGrace(job, now);
  }

  const phase = job.piPhase?.toUpperCase() ?? null;
  if (phase === "COMPLETED" || phase === "FAILED") {
    return isTerminalPhaseWithinGrace(job, now);
  }

  if (!ACTIVE_DB_STATUSES.has(job.status)) return false;
  if (!phase || !ACTIVE_PI_PHASES.has(phase)) return false;
  return isWithinActiveWindow(job, now);
}

export function mapJobToKioskDisplayState(job: JobRow): KioskJobDisplayStatus {
  const phase = job.piPhase?.toUpperCase() ?? null;

  if (job.status === "FAILED" || job.status === "CANCELLED" || phase === "FAILED") {
    return "FAILED";
  }
  if (phase === "COMPLETED" || job.status === "COMPLETED") return "COMPLETED";
  if (phase === "RECEIVED" || phase === "DOWNLOADING") return "RECEIVED";
  if (phase === "READY" || phase === "SUBMITTED") return "PREPARED";
  if (phase === "PRINTING" || job.status === "PRINTING") return "PRINTING";

  const display = resolveDisplayStatus(job);
  switch (display) {
    case "RECEIVED":
    case "DOWNLOADING":
      return "RECEIVED";
    case "READY":
      return "PREPARED";
    case "PRINTING":
      return "PRINTING";
    case "COMPLETED":
      return "COMPLETED";
    case "FAILED":
    case "CANCELLED":
      return "FAILED";
    default:
      return "RECEIVED";
  }
}

function terminalTimestamp(job: JobRow): Date | null {
  if (job.status === "COMPLETED") return job.completedAt;
  if (job.status === "FAILED" || job.status === "CANCELLED") return job.failedAt;
  return null;
}

function isTerminalWithinGrace(job: JobRow, now: Date): boolean {
  const ts = terminalTimestamp(job);
  if (!ts) return false;
  const ttl =
    job.status === "COMPLETED"
      ? KIOSK_DISPLAY_COMPLETED_TTL_MS
      : KIOSK_DISPLAY_FAILED_TTL_MS;
  return now.getTime() - ts.getTime() <= ttl;
}

export async function findActiveKioskDisplayJob(kioskId: string): Promise<JobRow | null> {
  const now = new Date();
  const activeStatuses = ["CLAIMED", "DOWNLOADING", "PRINTING"] as const;
  const terminalStatuses = ["COMPLETED", "FAILED", "CANCELLED"] as const;

  const rows = await db
    .select()
    .from(printJobs)
    .where(
      and(
        eq(printJobs.kioskId, kioskId),
        eq(printJobs.paymentStatus, "PAID"),
        or(
          inArray(printJobs.status, [...activeStatuses]),
          inArray(printJobs.status, [...terminalStatuses])
        )
      )
    )
    .orderBy(desc(printJobs.lastPiEventAt), desc(printJobs.dispatchedAt))
    .limit(10);

  for (const job of rows) {
    if (isKioskDisplayActiveJob(job, now)) {
      return job;
    }
  }

  return null;
}

export function buildDisplayStateFromJob(
  kiosk: typeof kiosks.$inferSelect,
  job: JobRow | null,
  now = new Date()
): KioskDisplayStateResponse {
  const scanUrl = kiosk.publicToken
    ? buildKioskScanUrl(kiosk.publicToken, env.FRONTEND_URL)
    : "";

  if (!job || !isKioskDisplayActiveJob(job, now)) {
    return {
      kioskCode: kiosk.kioskCode,
      kioskName: kiosk.name,
      scanUrl,
      state: "IDLE",
      jobId: null,
      updatedAt: now.toISOString(),
    };
  }

  const mapped = mapJobToKioskDisplayState(job);

  const state: KioskDisplayState =
    mapped === "RECEIVED"
      ? "RECEIVED"
      : mapped === "PREPARED"
        ? "PREPARED"
        : mapped === "PRINTING"
          ? "PRINTING"
          : mapped === "COMPLETED"
            ? "COMPLETED"
            : "FAILED";

  const updatedAt =
    job.lastPiEventAt ??
    job.completedAt ??
    job.failedAt ??
    job.dispatchedAt ??
    job.createdAt;

  return {
    kioskCode: kiosk.kioskCode,
    kioskName: kiosk.name,
    scanUrl,
    state,
    jobId: job.id,
    updatedAt: updatedAt.toISOString(),
  };
}

export async function getKioskDisplayState(
  kiosk: typeof kiosks.$inferSelect
): Promise<KioskDisplayStateResponse> {
  let job = await findActiveKioskDisplayJob(kiosk.id);
  if (job) {
    job = await applyJobTimeoutIfNeeded(job);
  }
  const base = buildDisplayStateFromJob(kiosk, job);
  const printerTelemetry = await resolvePrinterTelemetryByKioskId(kiosk.id);
  return {
    ...base,
    printer: toKioskDisplayPrinterSnapshot(printerTelemetry),
  };
}

export function buildKioskDisplayEvent(
  kiosk: typeof kiosks.$inferSelect,
  job: JobRow
): KioskDisplayEvent {
  const status = mapJobToKioskDisplayState(job);
  const updatedAt =
    job.lastPiEventAt ??
    job.completedAt ??
    job.failedAt ??
    job.dispatchedAt ??
    job.createdAt;

  return {
    type: "kiosk.job.status",
    kioskCode: kiosk.kioskCode,
    jobId: job.id,
    status,
    updatedAt: updatedAt.toISOString(),
  };
}

export async function broadcastKioskDisplayUpdate(
  kioskId: string,
  job: JobRow
): Promise<void> {
  const [kiosk] = await db.select().from(kiosks).where(eq(kiosks.id, kioskId)).limit(1);
  if (!kiosk) return;
  const event = buildKioskDisplayEvent(kiosk, job);
  getKioskDisplayRegistry().broadcast(kiosk.id, JSON.stringify(event));
}
