import { eq } from "drizzle-orm";
import { db } from "../db";
import { printJobs } from "../db/schema";
import { PrintJobEventType } from "../types/enums";
import { getStorageService } from "../storage/storage.service";
import { logger } from "../utils/logger";
import { addEvent } from "./print-job.service";

/** Delete source file after cancellation. Idempotent and non-fatal on storage errors. */
export async function deleteCancelledJobFile(jobId: string): Promise<void> {
  const [job] = await db.select().from(printJobs).where(eq(printJobs.id, jobId)).limit(1);
  if (!job) return;
  if (!job.storageKey) return;
  if (job.cleanupStatus === "SUCCESS") {
    logger.info({ jobId, jobNumber: job.jobNumber }, "cancelled file deletion skipped already cleaned");
    return;
  }

  const storage = getStorageService();
  try {
    await storage.delete(job.storageKey);
    await addEvent(job.id, PrintJobEventType.FILE_DELETED, { reason: "cancelled" });
    await db
      .update(printJobs)
      .set({ cleanupStatus: "SUCCESS" })
      .where(eq(printJobs.id, jobId));
    logger.info({ jobId, jobNumber: job.jobNumber }, "cancelled file deletion succeeded");
  } catch (e) {
    logger.warn({ err: e, jobId, jobNumber: job.jobNumber }, "cancelled file deletion failed");
    await db
      .update(printJobs)
      .set({ cleanupStatus: "FAILED" })
      .where(eq(printJobs.id, jobId));
  }
}
