import type { InferSelectModel } from "drizzle-orm";
import type { kiosks, printJobDocuments, printJobs, refunds, savedFiles } from "../db/schema";
import type { PrintJobListRow } from "../services/print-job.service";
import {
  buildJobSteps,
  displayLabel,
  displayMessage,
  isTerminalDisplayStatus,
  jobUpdatedAt,
  resolveDisplayStatus,
} from "../services/print-job-display.service";

type PrintJobSerializable = InferSelectModel<typeof printJobs> | PrintJobListRow;

function basePrintJobFields(job: PrintJobSerializable) {
  const hasPhase = "piPhase" in job;
  const piPhase = hasPhase ? (job as InferSelectModel<typeof printJobs>).piPhase : null;
  const userErrorCode = hasPhase ? (job as InferSelectModel<typeof printJobs>).userErrorCode : null;
  const dispatchedAt = job.dispatchedAt ?? null;

  const displayStatus = resolveDisplayStatus({
    status: job.status,
    paymentStatus: job.paymentStatus,
    piPhase,
    dispatchedAt,
    userErrorCode,
    paidAt: job.paidAt ?? null,
    completedAt: hasPhase ? (job as InferSelectModel<typeof printJobs>).completedAt ?? null : null,
    failedAt: hasPhase ? (job as InferSelectModel<typeof printJobs>).failedAt ?? null : null,
    lastPiEventAt: hasPhase ? (job as InferSelectModel<typeof printJobs>).lastPiEventAt ?? null : null,
    createdAt: job.createdAt,
  });

  const jobForMessage = {
    status: job.status,
    paymentStatus: job.paymentStatus,
    piPhase,
    dispatchedAt,
    userErrorCode,
    paidAt: job.paidAt ?? null,
    completedAt: hasPhase ? (job as InferSelectModel<typeof printJobs>).completedAt ?? null : null,
    failedAt: hasPhase ? (job as InferSelectModel<typeof printJobs>).failedAt ?? null : null,
    lastPiEventAt: hasPhase ? (job as InferSelectModel<typeof printJobs>).lastPiEventAt ?? null : null,
    createdAt: job.createdAt,
  };

  return {
    id: job.id,
    job_number: job.jobNumber,
    user_id: job.userId,
    status: job.status,
    payment_status: job.paymentStatus,
    original_filename: job.originalFilename,
    page_count: job.pageCount,
    copies: job.copies,
    page_range: job.pageRange,
    color_mode: job.colorMode,
    paper_size: job.paperSize,
    duplex: job.duplex,
    pages_per_sheet: job.pagesPerSheet,
    order: job.order,
    orientation: job.orientation,
    fit_to_page: job.fitToPage,
    physical_sheets: job.physicalSheets,
    amount_paise: job.amountPaise,
    currency: job.currency,
    save_file: job.saveFile,
    file_retention_until: job.fileRetentionUntil,
    kiosk_id: job.kioskId,
    saved_file_id: job.savedFileId,
    document_count:
      "documentCount" in job && typeof (job as PrintJobListRow).documentCount === "number"
        ? (job as PrintJobListRow).documentCount
        : 1,
    total_logical_pages:
      "totalLogicalPages" in job && (job as PrintJobListRow).totalLogicalPages != null
        ? (job as PrintJobListRow).totalLogicalPages
        : job.pageCount,
    bw_physical_sheets:
      "bwPhysicalSheets" in job ? (job as PrintJobListRow).bwPhysicalSheets : null,
    color_physical_sheets:
      "colorPhysicalSheets" in job ? (job as PrintJobListRow).colorPhysicalSheets : null,
    created_at: job.createdAt,
    paid_at: job.paidAt,
    claimed_at: job.claimedAt,
    dispatched_at: dispatchedAt,
    pi_phase: piPhase,
    display_status: displayStatus,
    display_label: displayLabel(displayStatus),
    display_message: displayMessage(jobForMessage),
    is_terminal: isTerminalDisplayStatus(displayStatus),
  };
}

export function serializeRefund(refund: InferSelectModel<typeof refunds>) {
  return {
    id: refund.id,
    print_job_id: refund.printJobId,
    payment_id: refund.paymentId,
    razorpay_payment_id: refund.razorpayPaymentId,
    razorpay_refund_id: refund.razorpayRefundId,
    amount_paise: refund.amountPaise,
    currency: refund.currency,
    status: refund.status,
    failure_reason: refund.failureReason,
    created_at: refund.createdAt,
    updated_at: refund.updatedAt,
    processed_at: refund.processedAt,
  };
}

type RefundListSummary = {
  id: string;
  status: string;
  amountPaise: number;
  currency: string;
};

type RefundSummary = InferSelectModel<typeof refunds> | RefundListSummary;

function refundSummaryFields(refund: RefundSummary) {
  return {
    id: refund.id,
    status: refund.status,
    amount_paise: refund.amountPaise,
    currency: refund.currency,
  };
}

export function serializePrintJob(job: PrintJobSerializable, refund?: RefundSummary | null) {
  const embeddedRefund =
    refund ??
    ("refund" in job && job.status === "CANCELLED" ? (job as PrintJobListRow).refund : null);
  const base = basePrintJobFields(job);
  if (job.status !== "CANCELLED" || !embeddedRefund) {
    return base;
  }
  return {
    ...base,
    refund: refundSummaryFields(embeddedRefund),
  };
}

export function serializePrintJobListItem(job: PrintJobListRow) {
  return serializePrintJob(job, job.refund ?? null);
}

export function serializePrintJobDetail(
  job: InferSelectModel<typeof printJobs>,
  options?: {
    kioskName?: string | null;
    kioskCode?: string | null;
    kioskServiceOnline?: boolean | null;
  }
) {
  const base = basePrintJobFields(job);
  const jobForMessage = {
    status: job.status,
    paymentStatus: job.paymentStatus,
    piPhase: job.piPhase,
    dispatchedAt: job.dispatchedAt,
    userErrorCode: job.userErrorCode,
    paidAt: job.paidAt,
    completedAt: job.completedAt,
    failedAt: job.failedAt,
    lastPiEventAt: job.lastPiEventAt,
    createdAt: job.createdAt,
  };
  const displayStatus = resolveDisplayStatus(jobForMessage);

  return {
    ...base,
    display_message: displayMessage(jobForMessage, {
      kioskServiceOnline: options?.kioskServiceOnline,
      kioskCode: options?.kioskCode,
      kioskName: options?.kioskName,
    }),
    steps: buildJobSteps(jobForMessage),
    user_error_code: job.userErrorCode ?? null,
    kiosk_name: options?.kioskName ?? null,
    kiosk_code: options?.kioskCode ?? null,
    kiosk_service_online: options?.kioskServiceOnline ?? null,
    updated_at: jobUpdatedAt(jobForMessage),
    cleanup_status: job.cleanupStatus ?? null,
    is_terminal: isTerminalDisplayStatus(displayStatus),
  };
}

type SavedFileSerializable = Pick<
  InferSelectModel<typeof savedFiles>,
  | "id"
  | "originalFilename"
  | "fileSizeBytes"
  | "pageCount"
  | "retentionUntil"
  | "createdAt"
>;

export function serializePrintJobDocument(
  doc: InferSelectModel<typeof printJobDocuments>
) {
  return {
    id: doc.id,
    sort_order: doc.sortOrder,
    saved_file_id: doc.savedFileId,
    original_filename: doc.originalFilename,
    page_count: doc.pageCount,
    copies: doc.copies,
    page_range: doc.pageRange,
    color_mode: doc.colorMode,
    paper_size: doc.paperSize,
    duplex: doc.duplex,
    pages_per_sheet: doc.pagesPerSheet,
    order: doc.order,
    orientation: doc.orientation,
    fit_to_page: doc.fitToPage,
    physical_sheets: doc.physicalSheets,
    pages_in_range: doc.pagesInRange,
    amount_paise: doc.amountPaise,
    pricing_snapshot: doc.pricingSnapshot,
  };
}

export function serializeSavedFile(
  file: SavedFileSerializable,
  downloadUrl?: string | null
) {
  return {
    id: file.id,
    original_filename: file.originalFilename,
    file_size_bytes: file.fileSizeBytes,
    page_count: file.pageCount,
    retention_until: file.retentionUntil,
    created_at: file.createdAt,
    download_url: downloadUrl ?? null,
  };
}

export function serializeKiosk(kiosk: InferSelectModel<typeof kiosks>) {
  return {
    id: kiosk.id,
    kiosk_code: kiosk.kioskCode,
    public_token: kiosk.publicToken,
    name: kiosk.name,
    location: kiosk.location,
    status: kiosk.status,
  };
}
