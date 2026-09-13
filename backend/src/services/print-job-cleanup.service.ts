import { eq } from "drizzle-orm";
import { db } from "../db";
import { printJobs } from "../db/schema";
import { PrintJobEventType } from "../types/enums";
import { getStorageService } from "../storage/storage.service";
import { logger } from "../utils/logger";
import { addEvent } from "./print-job.service";

/**
 * Delete source file after successful print when user did not opt into save-for-30-days.
 * Idempotent: safe to call multiple times for the same completed job.
 */
export async function cleanupJobSourceFile(jobId: string): Promise<void> {
  const [job] = await db.select().from(printJobs).where(eq(printJobs.id, jobId)).limit(1);
  if (!job) return;
  if (job.status !== "COMPLETED") return;
  if (job.saveFile) return;
  if (job.cleanupStatus === "SUCCESS") return;

  const storage = getStorageService();
  try {
    await storage.delete(job.storageKey);
    await addEvent(job.id, PrintJobEventType.FILE_DELETED, { reason: "post_print" });
    await db
      .update(printJobs)
      .set({ cleanupStatus: "SUCCESS" })
      .where(eq(printJobs.id, jobId));
    logger.info({ jobId, jobNumber: job.jobNumber }, "post-print storage cleanup success");
  } catch (e) {
    logger.warn({ err: e, jobId, jobNumber: job.jobNumber }, "post-print storage cleanup failed");
    await db
      .update(printJobs)
      .set({ cleanupStatus: "FAILED" })
      .where(eq(printJobs.id, jobId));
  }
}
