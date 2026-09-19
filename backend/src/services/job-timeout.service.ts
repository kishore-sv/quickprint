import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../db";
import { printJobEvents, printJobs } from "../db/schema";
import type { PrintJobStatus } from "../types/enums";
import { PrintJobEventType } from "../types/enums";
import { isTerminalDisplayStatus, resolveDisplayStatus } from "./print-job-display.service";

const TERMINAL: PrintJobStatus[] = ["COMPLETED", "FAILED", "CANCELLED", "EXPIRED"];

export async function applyJobTimeoutIfNeeded(
  job: typeof printJobs.$inferSelect
): Promise<typeof printJobs.$inferSelect> {
  if (TERMINAL.includes(job.status as PrintJobStatus)) {
    return job;
  }
  if (job.paymentStatus !== "PAID") {
    return job;
  }

  const display = resolveDisplayStatus(job);
  if (isTerminalDisplayStatus(display)) {
    return job;
  }

  const anchor = job.lastPiEventAt ?? job.dispatchedAt ?? job.paidAt;
  if (!anchor) {
    return job;
  }

  const timeoutMs = env.JOB_STUCK_TIMEOUT_MINUTES * 60 * 1000;
  if (Date.now() - anchor.getTime() < timeoutMs) {
    return job;
  }

  const now = new Date();
  const [updated] = await db
    .update(printJobs)
    .set({
      status: "FAILED",
      failedAt: now,
      userErrorCode: "JOB_TIMEOUT",
      failureReason: "Print service timed out",
      piPhase: "FAILED",
      lastPiEventAt: now,
    })
    .where(eq(printJobs.id, job.id))
    .returning();

  await db.insert(printJobEvents).values({
    id: randomUUID(),
    printJobId: job.id,
    eventType: PrintJobEventType.PRINT_FAILED,
    metadata: { reason: "timeout" },
  });

  if (updated?.kioskId) {
    void import("./kiosk-display.service").then(({ broadcastKioskDisplayUpdate }) =>
      broadcastKioskDisplayUpdate(updated.kioskId!, updated)
    );
  }

  return updated ?? job;
}
