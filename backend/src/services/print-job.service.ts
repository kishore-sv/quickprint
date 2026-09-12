import { randomBytes, randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { printJobEvents, printJobs } from "../db/schema";
import type { PrintJobStatus } from "../types/enums";
import { PrintJobEventType } from "../types/enums";
import { NotFoundError, PrintJobError } from "../utils/errors";
import { buildPriceBreakdown, getActiveRates } from "./pricing.service";
import type { PrintSettingsInput } from "../validators/print-job.validator";

export const ALLOWED_TRANSITIONS: Record<PrintJobStatus, PrintJobStatus[]> = {
  CREATED: ["PAYMENT_PENDING", "CANCELLED"],
  PAYMENT_PENDING: ["QUEUED", "CANCELLED", "FAILED"],
  PAID: ["QUEUED", "CLAIMED"],
  QUEUED: ["CLAIMED", "CANCELLED"],
  CLAIMED: ["DOWNLOADING", "PRINTING", "FAILED", "CANCELLED"],
  DOWNLOADING: ["PRINTING", "FAILED"],
  PRINTING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function canTransitionStatus(from: PrintJobStatus, to: PrintJobStatus): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export function generateJobNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomBytes(2).toString("hex").toUpperCase();
  return `QP-${datePart}-${suffix}`;
}

export async function addEvent(
  jobId: string,
  eventType: string,
  metadata?: Record<string, unknown>
) {
  await db.insert(printJobEvents).values({
    id: randomUUID(),
    printJobId: jobId,
    eventType,
    metadata: metadata ?? null,
  });
}

export async function recalculateJobPrice(jobId: string) {
  const [job] = await db.select().from(printJobs).where(eq(printJobs.id, jobId)).limit(1);
  if (!job) throw new NotFoundError("Job not found");

  const rates = await getActiveRates();
  const breakdown = buildPriceBreakdown({
    pageCount: job.pageCount,
    pageRange: job.pageRange,
    pagesPerSheet: job.pagesPerSheet,
    duplex: job.duplex,
    copies: job.copies,
    colorMode: job.colorMode,
    bwPaise: rates.bwPaise,
    colorPaise: rates.colorPaise,
    currency: rates.currency,
  });

  await db
    .update(printJobs)
    .set({
      physicalSheets: breakdown.physical_sheets,
      amountPaise: breakdown.total_paise,
      currency: breakdown.currency,
      pricingSnapshot: breakdown,
    })
    .where(eq(printJobs.id, jobId));
}

export function applyRetention(saveFile: boolean) {
  if (!saveFile) return { saveFile: false, fileRetentionUntil: null as Date | null };
  const until = new Date();
  until.setUTCDate(until.getUTCDate() + 30);
  return { saveFile: true, fileRetentionUntil: until };
}

export async function createPrintJob(
  userId: string,
  savedFile: {
    id: string;
    originalFilename: string;
    storageKey: string;
    fileSizeBytes: number;
    fileHash: string;
    pageCount: number;
  },
  settings: PrintSettingsInput
) {
  if (settings.color_mode !== "BW") {
    throw new PrintJobError("Color printing not enabled");
  }

  const retention = applyRetention(settings.save_file);
  const rates = await getActiveRates();
  const breakdown = buildPriceBreakdown({
    pageCount: savedFile.pageCount,
    pageRange: settings.page_range,
    pagesPerSheet: settings.pages_per_sheet,
    duplex: settings.duplex,
    copies: settings.copies,
    colorMode: settings.color_mode,
    bwPaise: rates.bwPaise,
    colorPaise: rates.colorPaise,
    currency: rates.currency,
  });

  const jobNumber = generateJobNumber();
  const [job] = await db
    .insert(printJobs)
    .values({
      id: randomUUID(),
      jobNumber,
      userId,
      savedFileId: savedFile.id,
      status: "CREATED",
      paymentStatus: "UNPAID",
      originalFilename: savedFile.originalFilename,
      storageKey: savedFile.storageKey,
      fileSizeBytes: savedFile.fileSizeBytes,
      fileHash: savedFile.fileHash,
      pageCount: savedFile.pageCount,
      copies: settings.copies,
      pageRange: settings.page_range,
      colorMode: settings.color_mode,
      paperSize: settings.paper_size,
      duplex: settings.duplex,
      pagesPerSheet: settings.pages_per_sheet,
      order: settings.order,
      orientation: settings.orientation,
      fitToPage: settings.fit_to_page,
      physicalSheets: breakdown.physical_sheets,
      amountPaise: breakdown.total_paise,
      currency: breakdown.currency,
      pricingSnapshot: breakdown,
      saveFile: retention.saveFile,
      fileRetentionUntil: retention.fileRetentionUntil,
    })
    .returning();

  await addEvent(job.id, PrintJobEventType.JOB_CREATED);
  return job;
}

export async function getOwnedJob(jobId: string, userId: string) {
  const [job] = await db
    .select()
    .from(printJobs)
    .where(and(eq(printJobs.id, jobId), eq(printJobs.userId, userId)))
    .limit(1);
  if (!job) throw new NotFoundError("Job not found");
  return job;
}

export async function transitionJob(
  jobId: string,
  to: PrintJobStatus,
  extra?: Partial<typeof printJobs.$inferInsert>
) {
  const [job] = await db.select().from(printJobs).where(eq(printJobs.id, jobId)).limit(1);
  if (!job) throw new NotFoundError("Job not found");

  const allowed = ALLOWED_TRANSITIONS[job.status as PrintJobStatus] ?? [];
  if (!allowed.includes(to)) {
    throw new PrintJobError(`Cannot transition from ${job.status} to ${to}`, "INVALID_TRANSITION");
  }

  await db.update(printJobs).set({ status: to, ...extra }).where(eq(printJobs.id, jobId));
}

export async function listUserJobs(userId: string, statusFilter?: PrintJobStatus, limit = 100) {
  const conditions = [eq(printJobs.userId, userId)];
  if (statusFilter) {
    conditions.push(eq(printJobs.status, statusFilter));
  }
  return db
    .select()
    .from(printJobs)
    .where(and(...conditions))
    .orderBy(desc(printJobs.createdAt))
    .limit(limit);
}
