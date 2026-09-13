import { and, asc, eq, isNotNull, isNull, or } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../db";
import { printJobs } from "../db/schema";
import { PrintJobEventType } from "../types/enums";
import { getStorageService } from "../storage/storage.service";
import { wsLogger } from "../utils/logger";
import { buildJobAssignedMessage, pageRangeForPiAgent } from "../ws/kiosk-agent.protocol";
import { getKioskAgentRegistry } from "../ws/kiosk-agent.registry";
import { addEvent } from "./print-job.service";

const inFlightByKiosk = new Map<string, string>();

function printSettingsForPi(job: typeof printJobs.$inferSelect) {
  return {
    copies: job.copies,
    page_range: pageRangeForPiAgent(job.pageRange),
    color_mode: job.colorMode.toLowerCase(),
    paper_size: job.paperSize,
    duplex: job.duplex === "DOUBLE",
    pages_per_sheet: job.pagesPerSheet,
    order: job.order.toLowerCase(),
    orientation: job.orientation.toLowerCase(),
    fit_to_page: job.fitToPage,
  };
}

export async function findNextDispatchableJob(kioskId: string) {
  const rows = await db
    .select()
    .from(printJobs)
    .where(
      and(
        eq(printJobs.kioskId, kioskId),
        eq(printJobs.paymentStatus, "PAID"),
        eq(printJobs.status, "QUEUED"),
        isNull(printJobs.dispatchedAt)
      )
    )
    .orderBy(asc(printJobs.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function dispatchJobToKiosk(kioskId: string, jobId: string): Promise<boolean> {
  const registry = getKioskAgentRegistry();
  const socket = registry.getConnection(kioskId);
  if (!socket || socket.readyState !== 1) {
    return false;
  }

  if (inFlightByKiosk.get(kioskId)) {
    return false;
  }

  const [job] = await db
    .select()
    .from(printJobs)
    .where(
      and(
        eq(printJobs.id, jobId),
        eq(printJobs.kioskId, kioskId),
        eq(printJobs.paymentStatus, "PAID"),
        eq(printJobs.status, "QUEUED"),
        isNull(printJobs.dispatchedAt)
      )
    )
    .limit(1);
  if (!job) return false;

  const storage = getStorageService();
  const fileUrl = await storage.getSignedUrl(job.storageKey, env.PI_JOB_DOWNLOAD_EXPIRES);

  const payload = buildJobAssignedMessage({
    job_id: job.id,
    file_url: fileUrl,
    filename: job.originalFilename,
    print_settings: printSettingsForPi(job),
  });

  socket.send(payload);
  inFlightByKiosk.set(kioskId, job.id);

  const now = new Date();
  await db
    .update(printJobs)
    .set({
      dispatchedAt: now,
    })
    .where(eq(printJobs.id, job.id));

  await addEvent(job.id, PrintJobEventType.PRINT_REQUESTED, { kiosk_id: kioskId });

  wsLogger.info({ jobId: job.id, kioskId }, "ws dispatch job.assigned");
  return true;
}

export function clearInFlightForJob(kioskId: string, jobId: string) {
  if (inFlightByKiosk.get(kioskId) === jobId) {
    inFlightByKiosk.delete(kioskId);
  }
}

export function clearInFlightKiosk(kioskId: string) {
  inFlightByKiosk.delete(kioskId);
}

/** Jobs dispatched to Pi but never acknowledged — return to the scan queue. */
function unacknowledgedJobCondition(kioskId: string) {
  return and(
    eq(printJobs.kioskId, kioskId),
    eq(printJobs.paymentStatus, "PAID"),
    isNotNull(printJobs.dispatchedAt),
    isNull(printJobs.lastPiEventAt),
    or(
      and(eq(printJobs.status, "QUEUED")),
      and(eq(printJobs.status, "CLAIMED"))
    )
  );
}

export async function requeueUnacknowledgedJobsForKiosk(kioskId: string) {
  const stuck = await db
    .select({ id: printJobs.id })
    .from(printJobs)
    .where(unacknowledgedJobCondition(kioskId));

  if (stuck.length === 0) return 0;

  for (const { id } of stuck) {
    clearInFlightForJob(kioskId, id);
  }

  const requeued = await db
    .update(printJobs)
    .set({ status: "QUEUED", dispatchedAt: null, piPhase: null })
    .where(unacknowledgedJobCondition(kioskId))
    .returning({ id: printJobs.id });

  for (const row of requeued) {
    await addEvent(row.id, PrintJobEventType.QUEUED, { reason: "requeue_unacknowledged" });
    wsLogger.info({ jobId: row.id, kioskId }, "ws requeue unacknowledged job");
  }

  return requeued.length;
}

export async function requeueUnacknowledgedJobsForUser(userId: string) {
  const stuck = await db
    .select({ id: printJobs.id, kioskId: printJobs.kioskId })
    .from(printJobs)
    .where(
      and(
        eq(printJobs.userId, userId),
        eq(printJobs.paymentStatus, "PAID"),
        eq(printJobs.status, "CLAIMED"),
        isNotNull(printJobs.dispatchedAt),
        isNull(printJobs.lastPiEventAt)
      )
    );

  let count = 0;
  const kioskIds = new Set<string>();
  for (const row of stuck) {
    if (row.kioskId) kioskIds.add(row.kioskId);
  }
  for (const kioskId of kioskIds) {
    count += await requeueUnacknowledgedJobsForKiosk(kioskId);
  }
  return count;
}

export async function enqueueDispatchForKiosk(kioskId: string) {
  if (inFlightByKiosk.has(kioskId)) {
    return;
  }
  const next = await findNextDispatchableJob(kioskId);
  if (!next) return;
  const sent = await dispatchJobToKiosk(kioskId, next.id);
  if (!sent) {
    wsLogger.debug({ kioskId }, "ws dispatch skipped (offline or busy)");
  }
}

export async function onAgentConnected(kioskId: string) {
  await enqueueDispatchForKiosk(kioskId);
}

/** Test helper */
export function resetDispatchState() {
  inFlightByKiosk.clear();
}

export async function markJobDispatchComplete(kioskId: string, jobId: string) {
  clearInFlightForJob(kioskId, jobId);
  await enqueueDispatchForKiosk(kioskId);
}
