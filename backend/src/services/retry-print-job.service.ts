import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { printJobs } from "../db/schema";
import { PrintJobEventType } from "../types/enums";
import { PrintJobError } from "../utils/errors";
import { broadcastKioskDisplayUpdate } from "./kiosk-display.service";
import { enqueueDispatchForKiosk } from "./kiosk-dispatch.service";
import { addEvent, getOwnedJob } from "./print-job.service";

export async function retryFailedPrintJob(userId: string, jobId: string) {
  const job = await getOwnedJob(jobId, userId);

  if (job.status !== "FAILED") {
    throw new PrintJobError("Only failed jobs can be retried", "JOB_NOT_RETRYABLE");
  }
  if (job.paymentStatus !== "PAID") {
    throw new PrintJobError("Job is not paid", "JOB_NOT_RETRYABLE");
  }
  if (!job.kioskId) {
    throw new PrintJobError("Job has no kiosk assigned", "JOB_NOT_RETRYABLE");
  }

  const [updated] = await db
    .update(printJobs)
    .set({
      status: "QUEUED",
      dispatchedAt: null,
      piPhase: null,
      failedAt: null,
      failureReason: null,
      userErrorCode: null,
      claimedAt: null,
      printingStartedAt: null,
      printerJobId: null,
      lastPiEventAt: null,
    })
    .where(
      and(
        eq(printJobs.id, jobId),
        eq(printJobs.userId, userId),
        eq(printJobs.status, "FAILED"),
        eq(printJobs.paymentStatus, "PAID")
      )
    )
    .returning();

  if (!updated) {
    throw new PrintJobError("Job cannot be retried", "JOB_NOT_RETRYABLE");
  }

  await addEvent(jobId, PrintJobEventType.QUEUED, { reason: "user_retry" });
  void enqueueDispatchForKiosk(updated.kioskId!);
  void broadcastKioskDisplayUpdate(updated.kioskId!, updated);

  return updated;
}
