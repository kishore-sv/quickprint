import { randomBytes, randomUUID } from "crypto";
import { and, desc, eq, isNull, not, notInArray, or } from "drizzle-orm";
import { db } from "../db";
import { printJobEvents, printJobs, refunds } from "../db/schema";
import type { PrintJobStatus } from "../types/enums";
import { PrintJobEventType } from "../types/enums";
import { NotFoundError, PrintJobError } from "../utils/errors";
import { requeueUnacknowledgedJobsForUser } from "./kiosk-dispatch.service";
import { buildPriceBreakdown, getActiveRates } from "./pricing.service";
import type { PrintSettingsInput } from "../validators/print-job.validator";

const TERMINAL_STATUSES = ["CANCELLED", "FAILED", "COMPLETED", "EXPIRED"] as const;

export const printJobListSelection = {
  id: printJobs.id,
  jobNumber: printJobs.jobNumber,
  userId: printJobs.userId,
  kioskId: printJobs.kioskId,
  savedFileId: printJobs.savedFileId,
  status: printJobs.status,
  paymentStatus: printJobs.paymentStatus,
  originalFilename: printJobs.originalFilename,
  pageCount: printJobs.pageCount,
  copies: printJobs.copies,
  pageRange: printJobs.pageRange,
  colorMode: printJobs.colorMode,
  paperSize: printJobs.paperSize,
  duplex: printJobs.duplex,
  pagesPerSheet: printJobs.pagesPerSheet,
  order: printJobs.order,
  orientation: printJobs.orientation,
  fitToPage: printJobs.fitToPage,
  physicalSheets: printJobs.physicalSheets,
  amountPaise: printJobs.amountPaise,
  currency: printJobs.currency,
  saveFile: printJobs.saveFile,
  fileRetentionUntil: printJobs.fileRetentionUntil,
  createdAt: printJobs.createdAt,
  paidAt: printJobs.paidAt,
  claimedAt: printJobs.claimedAt,
  dispatchedAt: printJobs.dispatchedAt,
  piPhase: printJobs.piPhase,
  userErrorCode: printJobs.userErrorCode,
  completedAt: printJobs.completedAt,
  failedAt: printJobs.failedAt,
  lastPiEventAt: printJobs.lastPiEventAt,
};

export type PrintJobListRow = {
  id: string;
  jobNumber: string;
  userId: string;
  kioskId: string | null;
  savedFileId: string | null;
  status: string;
  paymentStatus: string;
  originalFilename: string;
  pageCount: number;
  copies: number;
  pageRange: string;
  colorMode: string;
  paperSize: string;
  duplex: string;
  pagesPerSheet: number;
  order: string;
  orientation: string;
  fitToPage: boolean;
  physicalSheets: number | null;
  amountPaise: number | null;
  currency: string;
  saveFile: boolean;
  fileRetentionUntil: Date | null;
  createdAt: Date;
  paidAt: Date | null;
  claimedAt: Date | null;
  dispatchedAt: Date | null;
  piPhase: string | null;
  userErrorCode: string | null;
  completedAt: Date | null;
  failedAt: Date | null;
  lastPiEventAt: Date | null;
  refund?: {
    id: string;
    status: string;
    amountPaise: number;
    currency: string;
  } | null;
};

export type ListUserJobsView = "all" | "active" | "ready";

export type ListUserJobsOptions = {
  statusFilter?: PrintJobStatus;
  view?: ListUserJobsView;
  page?: number;
  limit?: number;
};

export type ListUserJobsResult = {
  items: PrintJobListRow[];
  page: number;
  limit: number;
  has_more: boolean;
};

export const ALLOWED_TRANSITIONS: Record<PrintJobStatus, PrintJobStatus[]> = {
  CREATED: ["PAYMENT_PENDING", "CANCELLED"],
  PAYMENT_PENDING: ["QUEUED", "CANCELLED", "FAILED"],
  PAID: ["QUEUED", "CLAIMED"],
  QUEUED: ["CLAIMED", "CANCELLED"],
  CLAIMED: ["DOWNLOADING", "PRINTING", "FAILED", "CANCELLED"],
  DOWNLOADING: ["PRINTING", "FAILED", "CANCELLED"],
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

function readyForKioskCondition() {
  return and(
    eq(printJobs.paymentStatus, "PAID"),
    isNull(printJobs.dispatchedAt),
    or(eq(printJobs.status, "QUEUED"), eq(printJobs.status, "PAID"))
  );
}

function activeJobsCondition() {
  return or(
    and(
      not(eq(printJobs.paymentStatus, "PAID")),
      notInArray(printJobs.status, [...TERMINAL_STATUSES])
    ),
    and(
      eq(printJobs.paymentStatus, "PAID"),
      notInArray(printJobs.status, [...TERMINAL_STATUSES])
    )
  );
}

export function parseListJobsQuery(query: Record<string, unknown>): ListUserJobsOptions {
  const page = Math.max(1, parseInt(String(query.page ?? "1"), 10) || 1);
  const rawLimit = parseInt(String(query.limit ?? "20"), 10) || 20;
  const limit = Math.min(50, Math.max(1, rawLimit));
  const viewRaw = String(query.view ?? "all");
  const view: ListUserJobsView =
    viewRaw === "active" || viewRaw === "ready" ? viewRaw : "all";
  const status = query.status ? String(query.status) as PrintJobStatus : undefined;
  return { page, limit, view, statusFilter: status };
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

export async function listUserJobs(
  userId: string,
  options: ListUserJobsOptions = {}
): Promise<ListUserJobsResult> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const view = options.view ?? "all";
  const offset = (page - 1) * limit;

  if (view === "ready" || view === "active") {
    await requeueUnacknowledgedJobsForUser(userId);
  }

  const conditions = [eq(printJobs.userId, userId)];
  if (options.statusFilter) {
    conditions.push(eq(printJobs.status, options.statusFilter));
  }
  if (view === "active") {
    conditions.push(activeJobsCondition()!);
  } else if (view === "ready") {
    conditions.push(readyForKioskCondition()!);
  }

  const rows = await db
    .select({
      ...printJobListSelection,
      refundId: refunds.id,
      refundStatus: refunds.status,
      refundAmountPaise: refunds.amountPaise,
      refundCurrency: refunds.currency,
    })
    .from(printJobs)
    .leftJoin(refunds, eq(refunds.printJobId, printJobs.id))
    .where(and(...conditions))
    .orderBy(desc(printJobs.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const has_more = rows.length > limit;
  const sliced = has_more ? rows.slice(0, limit) : rows;
  const items: PrintJobListRow[] = sliced.map((row) => ({
    id: row.id,
    jobNumber: row.jobNumber,
    userId: row.userId,
    kioskId: row.kioskId,
    savedFileId: row.savedFileId,
    status: row.status,
    paymentStatus: row.paymentStatus,
    originalFilename: row.originalFilename,
    pageCount: row.pageCount,
    copies: row.copies,
    pageRange: row.pageRange,
    colorMode: row.colorMode,
    paperSize: row.paperSize,
    duplex: row.duplex,
    pagesPerSheet: row.pagesPerSheet,
    order: row.order,
    orientation: row.orientation,
    fitToPage: row.fitToPage,
    physicalSheets: row.physicalSheets,
    amountPaise: row.amountPaise,
    currency: row.currency,
    saveFile: row.saveFile,
    fileRetentionUntil: row.fileRetentionUntil,
    createdAt: row.createdAt,
    paidAt: row.paidAt,
    claimedAt: row.claimedAt,
    dispatchedAt: row.dispatchedAt,
    piPhase: row.piPhase,
    userErrorCode: row.userErrorCode,
    completedAt: row.completedAt,
    failedAt: row.failedAt,
    lastPiEventAt: row.lastPiEventAt,
    refund:
      row.status === "CANCELLED" && row.refundId
        ? {
            id: row.refundId,
            status: row.refundStatus!,
            amountPaise: row.refundAmountPaise!,
            currency: row.refundCurrency!,
          }
        : null,
  }));

  return { items, page, limit, has_more };
}
