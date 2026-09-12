import { and, eq, isNotNull, lt } from "drizzle-orm";
import { db } from "../db";
import { printJobs, savedFiles } from "../db/schema";
import { getStorageService } from "../storage/storage.service";
import { PrintJobEventType } from "../types/enums";
import { addEvent } from "./print-job.service";
import { logger } from "../utils/logger";

/**
 * Deletes stored files past retention. Run via cron/worker.
 * Job/history metadata is preserved.
 */
export async function cleanupExpiredFiles() {
  const now = new Date();
  const storage = getStorageService();

  const expiredSaved = await db
    .select()
    .from(savedFiles)
    .where(and(isNotNull(savedFiles.retentionUntil), lt(savedFiles.retentionUntil, now)));

  for (const file of expiredSaved) {
    try {
      await storage.delete(file.storageKey);
    } catch (e) {
      logger.warn({ err: e, key: file.storageKey }, "Failed to delete saved file from storage");
    }
    await db.delete(savedFiles).where(eq(savedFiles.id, file.id));
  }

  const completedJobs = await db
    .select()
    .from(printJobs)
    .where(
      and(
        eq(printJobs.saveFile, false),
        eq(printJobs.status, "COMPLETED"),
        isNotNull(printJobs.storageKey)
      )
    );

  for (const job of completedJobs) {
    if (job.fileRetentionUntil && job.fileRetentionUntil > now) continue;
    try {
      await storage.delete(job.storageKey);
      await addEvent(job.id, PrintJobEventType.FILE_DELETED, { reason: "retention" });
    } catch (e) {
      logger.warn({ err: e, jobId: job.id }, "Retention cleanup failed for job file");
    }
  }
}
