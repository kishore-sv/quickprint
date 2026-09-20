import { randomBytes, randomUUID } from "crypto";
import { and, asc, desc, eq, isNull, not, notInArray, or } from "drizzle-orm";
import { db } from "../db";
import { printJobDocuments, printJobEvents, printJobs, refunds, savedFiles } from "../db/schema";
import type { PrintJobStatus } from "../types/enums";
import { PrintJobEventType } from "../types/enums";
import { NotFoundError, PrintJobError } from "../utils/errors";
import { requeueUnacknowledgedJobsForUser } from "./kiosk-dispatch.service";
import {
  aggregatePriceBreakdowns,
  buildPriceBreakdown,
  getActiveRates,
} from "./pricing.service";
import { ensureMergedPdf } from "./print-composition.service";
import type { PrintDocumentInput, PrintSettingsInput } from "../validators/print-job.validator";

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
  documentCount: printJobs.documentCount,
  totalLogicalPages: printJobs.totalLogicalPages,
  bwPhysicalSheets: printJobs.bwPhysicalSheets,
  colorPhysicalSheets: printJobs.colorPhysicalSheets,
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
  documentCount: number;
  totalLogicalPages: number | null;
  bwPhysicalSheets: number | null;
  colorPhysicalSheets: number | null;
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

export function applyRetention(saveFile: boolean) {
  if (!saveFile) return { saveFile: false, fileRetentionUntil: null as Date | null };
  const until = new Date();
  until.setUTCDate(until.getUTCDate() + 30);
  return { saveFile: true, fileRetentionUntil: until };
}

export async function getJobDocuments(jobId: string) {
  return db
    .select()
    .from(printJobDocuments)
    .where(eq(printJobDocuments.printJobId, jobId))
    .orderBy(asc(printJobDocuments.sortOrder));
}

function formatJobFilename(docCount: number, firstName: string): string {
  if (docCount <= 1) return firstName;
  return `${firstName} + ${docCount - 1} more`;
}

function hasMixedColorModes(breakdowns: ReturnType<typeof buildPriceBreakdown>[]): boolean {
  const modes = new Set(breakdowns.map((b) => b.color_mode));
  return modes.size > 1;
}

async function resolveSavedFiles(
  userId: string,
  documents: PrintDocumentInput[]
) {
  const resolved = [];
  for (const doc of documents) {
    const [saved] = await db
      .select()
      .from(savedFiles)
      .where(and(eq(savedFiles.id, doc.saved_file_id), eq(savedFiles.userId, userId)))
      .limit(1);
    if (!saved) throw new NotFoundError("File not found");
    resolved.push({ doc, saved });
  }
  return resolved;
}

async function buildDocumentRows(
  documents: PrintDocumentInput[],
  savedFilesList: Awaited<ReturnType<typeof resolveSavedFiles>>,
  rates: Awaited<ReturnType<typeof getActiveRates>>
) {
  const rows = [];
  const breakdowns = [];

  for (let i = 0; i < documents.length; i++) {
    const settings = documents[i];
    const saved = savedFilesList[i]!.saved;
    const breakdown = buildPriceBreakdown({
      pageCount: saved.pageCount,
      pageRange: settings.page_range,
      pagesPerSheet: settings.pages_per_sheet,
      duplex: settings.duplex,
      copies: settings.copies,
      colorMode: settings.color_mode,
      bwPaise: rates.bwPaise,
      colorPaise: rates.colorPaise,
      currency: rates.currency,
      order: settings.order,
    });
    breakdowns.push(breakdown);
    rows.push({
      sortOrder: i,
      savedFileId: saved.id,
      originalFilename: saved.originalFilename,
      storageKey: saved.storageKey,
      fileHash: saved.fileHash,
      pageCount: saved.pageCount,
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
      pagesInRange: breakdown.pages_in_range,
      amountPaise: breakdown.total_paise,
      pricingSnapshot: breakdown,
    });
  }

  return { rows, breakdowns, aggregate: aggregatePriceBreakdowns(breakdowns, rates.currency) };
}

export async function createPrintJob(
  userId: string,
  documents: PrintDocumentInput[],
  jobSettings?: { save_file?: boolean }
) {
  if (documents.length === 0) {
    throw new PrintJobError("At least one document is required");
  }

  const saveFile = jobSettings?.save_file ?? documents.some((d) => d.save_file);
  const retention = applyRetention(saveFile);
  const rates = await getActiveRates();
  const savedFilesList = await resolveSavedFiles(userId, documents);
  const { rows, aggregate } = await buildDocumentRows(documents, savedFilesList, rates);

  const first = rows[0]!;
  const firstSaved = savedFilesList[0]!.saved;
  const jobNumber = generateJobNumber();
  const jobId = randomUUID();

  const [job] = await db
    .insert(printJobs)
    .values({
      id: jobId,
      jobNumber,
      userId,
      savedFileId: firstSaved.id,
      status: "CREATED",
      paymentStatus: "UNPAID",
      originalFilename: formatJobFilename(rows.length, first.originalFilename),
      storageKey: first.storageKey,
      fileSizeBytes: firstSaved.fileSizeBytes,
      fileHash: first.fileHash,
      pageCount: aggregate.total_logical_pages,
      copies: first.copies,
      pageRange: first.pageRange,
      colorMode: hasMixedColorModes(aggregate.documents) ? "COLOR" : first.colorMode,
      paperSize: first.paperSize,
      duplex: first.duplex,
      pagesPerSheet: first.pagesPerSheet,
      order: first.order,
      orientation: first.orientation,
      fitToPage: first.fitToPage,
      physicalSheets: aggregate.physical_sheets,
      amountPaise: aggregate.total_paise,
      currency: aggregate.currency,
      pricingSnapshot: aggregate,
      saveFile: retention.saveFile,
      fileRetentionUntil: retention.fileRetentionUntil,
      documentCount: rows.length,
      totalLogicalPages: aggregate.total_logical_pages,
      bwPhysicalSheets: aggregate.bw_physical_sheets,
      colorPhysicalSheets: aggregate.color_physical_sheets,
      mergedStorageKey: null,
    })
    .returning();

  await db.insert(printJobDocuments).values(
    rows.map((row) => ({
      id: randomUUID(),
      printJobId: jobId,
      ...row,
    }))
  );

  if (saveFile) {
    for (const { saved } of savedFilesList) {
      if (!saved.retentionUntil) {
        await db
          .update(savedFiles)
          .set({ retentionUntil: retention.fileRetentionUntil })
          .where(eq(savedFiles.id, saved.id));
      }
    }
  }

  try {
    const docs = await getJobDocuments(jobId);
    const mergedKey = await ensureMergedPdf(jobId, docs, null);
    await db
      .update(printJobs)
      .set({ mergedStorageKey: mergedKey })
      .where(eq(printJobs.id, jobId));
    job.mergedStorageKey = mergedKey;
  } catch {
    // Composition can be retried at dispatch
  }

  await addEvent(job.id, PrintJobEventType.JOB_CREATED, { document_count: rows.length });
  return job;
}

export async function updatePrintJobDocuments(
  jobId: string,
  userId: string,
  documents: PrintDocumentInput[],
  jobSettings?: { save_file?: boolean }
) {
  const job = await getOwnedJob(jobId, userId);
  if (job.paymentStatus === "PAID") {
    throw new PrintJobError("Cannot edit paid job");
  }
  if (documents.length === 0) {
    throw new PrintJobError("At least one document is required");
  }

  const saveFile = jobSettings?.save_file ?? documents.some((d) => d.save_file);
  const retention = applyRetention(saveFile);
  const rates = await getActiveRates();
  const savedFilesList = await resolveSavedFiles(userId, documents);
  const { rows, aggregate } = await buildDocumentRows(documents, savedFilesList, rates);
  const first = rows[0]!;
  const firstSaved = savedFilesList[0]!.saved;

  await db.delete(printJobDocuments).where(eq(printJobDocuments.printJobId, jobId));

  await db.insert(printJobDocuments).values(
    rows.map((row) => ({
      id: randomUUID(),
      printJobId: jobId,
      ...row,
    }))
  );

  await db
    .update(printJobs)
    .set({
      originalFilename: formatJobFilename(rows.length, first.originalFilename),
      storageKey: first.storageKey,
      fileSizeBytes: firstSaved.fileSizeBytes,
      fileHash: first.fileHash,
      pageCount: aggregate.total_logical_pages,
      copies: first.copies,
      pageRange: first.pageRange,
      colorMode: hasMixedColorModes(aggregate.documents) ? "COLOR" : first.colorMode,
      paperSize: first.paperSize,
      duplex: first.duplex,
      pagesPerSheet: first.pagesPerSheet,
      order: first.order,
      orientation: first.orientation,
      fitToPage: first.fitToPage,
      physicalSheets: aggregate.physical_sheets,
      amountPaise: aggregate.total_paise,
      currency: aggregate.currency,
      pricingSnapshot: aggregate,
      saveFile: retention.saveFile,
      fileRetentionUntil: retention.fileRetentionUntil,
      documentCount: rows.length,
      totalLogicalPages: aggregate.total_logical_pages,
      bwPhysicalSheets: aggregate.bw_physical_sheets,
      colorPhysicalSheets: aggregate.color_physical_sheets,
      mergedStorageKey: null,
      savedFileId: firstSaved.id,
    })
    .where(eq(printJobs.id, jobId));

  try {
    const docs = await getJobDocuments(jobId);
    const mergedKey = await ensureMergedPdf(jobId, docs, null);
    await db
      .update(printJobs)
      .set({ mergedStorageKey: mergedKey })
      .where(eq(printJobs.id, jobId));
  } catch {
    // retried at dispatch
  }

  return getOwnedJob(jobId, userId);
}

export async function deleteJobDocument(
  jobId: string,
  documentId: string,
  userId: string
) {
  const job = await getOwnedJob(jobId, userId);
  if (job.paymentStatus === "PAID") {
    throw new PrintJobError("Cannot edit paid job");
  }

  const docs = await getJobDocuments(jobId);
  if (docs.length <= 1) {
    throw new PrintJobError("Cannot delete the only document in a job");
  }

  const target = docs.find((d) => d.id === documentId);
  if (!target) throw new NotFoundError("Document not found");

  await db.delete(printJobDocuments).where(eq(printJobDocuments.id, documentId));

  const remaining = docs
    .filter((d) => d.id !== documentId)
    .map((d, i) => ({
      saved_file_id: d.savedFileId!,
      copies: d.copies,
      page_range: d.pageRange,
      color_mode: d.colorMode,
      paper_size: d.paperSize,
      duplex: d.duplex,
      pages_per_sheet: d.pagesPerSheet,
      order: d.order,
      orientation: d.orientation,
      fit_to_page: d.fitToPage,
      save_file: job.saveFile,
    }));

  return updatePrintJobDocuments(jobId, userId, remaining, { save_file: job.saveFile });
}

export async function recalculateJobPrice(jobId: string) {
  const docs = await getJobDocuments(jobId);
  if (docs.length === 0) {
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
      order: job.order,
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
    return;
  }

  const rates = await getActiveRates();
  const breakdowns = docs.map((doc) =>
    buildPriceBreakdown({
      pageCount: doc.pageCount,
      pageRange: doc.pageRange,
      pagesPerSheet: doc.pagesPerSheet,
      duplex: doc.duplex,
      copies: doc.copies,
      colorMode: doc.colorMode,
      bwPaise: rates.bwPaise,
      colorPaise: rates.colorPaise,
      currency: rates.currency,
      order: doc.order,
    })
  );
  const aggregate = aggregatePriceBreakdowns(breakdowns, rates.currency);

  await db
    .update(printJobs)
    .set({
      physicalSheets: aggregate.physical_sheets,
      amountPaise: aggregate.total_paise,
      currency: aggregate.currency,
      pricingSnapshot: aggregate,
      totalLogicalPages: aggregate.total_logical_pages,
      bwPhysicalSheets: aggregate.bw_physical_sheets,
      colorPhysicalSheets: aggregate.color_physical_sheets,
    })
    .where(eq(printJobs.id, jobId));
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
    documentCount: row.documentCount,
    totalLogicalPages: row.totalLogicalPages,
    bwPhysicalSheets: row.bwPhysicalSheets,
    colorPhysicalSheets: row.colorPhysicalSheets,
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
