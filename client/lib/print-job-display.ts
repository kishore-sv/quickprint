import type { PrintJob } from "@/lib/types";
import {
  isActivePrintJobAtKiosk,
  isQueuedPrintJob,
  mapPrintJobStatus,
  printJobNeedsPayment,
} from "@/lib/map-print-job-status";

export function jobNeedsPayment(job: PrintJob): boolean {
  return printJobNeedsPayment(job);
}

export function jobInQueue(job: PrintJob): boolean {
  return isQueuedPrintJob(job);
}

export function jobAtKiosk(job: PrintJob): boolean {
  return isActivePrintJobAtKiosk(job);
}

/** Paid, not yet released at a kiosk — show on Home and Scan */
export function jobReadyForKioskRelease(job: PrintJob): boolean {
  return isQueuedPrintJob(job);
}

export function isActiveJob(job: PrintJob): boolean {
  const mapped = mapPrintJobStatus(job);
  return (
    mapped.status === "AWAITING_PAYMENT" ||
    mapped.status === "QUEUED" ||
    isActivePrintJobAtKiosk(job)
  );
}

function colorModeSummary(job: PrintJob): string {
  const docCount = job.document_count ?? 1;
  const hasBw = (job.bw_physical_sheets ?? 0) > 0;
  const hasColor = (job.color_physical_sheets ?? 0) > 0;
  if (hasBw && hasColor) return "B&W + Color";
  if (hasColor || job.color_mode === "COLOR") return "Color";
  return "B&W";
}

export function formatJobSummary(job: PrintJob): string {
  const docCount = job.document_count ?? 1;
  const pages = job.total_logical_pages ?? job.page_count;
  const pageLabel = docCount > 1
    ? `${docCount} documents · ${pages} pages`
    : `${pages} page${pages === 1 ? "" : "s"}`;
  const sheets = job.physical_sheets;
  const sheetsLabel = sheets != null ? ` · ${sheets} sheet${sheets === 1 ? "" : "s"}` : "";
  const color = colorModeSummary(job);
  return `${pageLabel}${sheetsLabel} · ${color}`;
}

export function formatJobAmount(job: PrintJob): string | null {
  if (job.amount_paise == null) return null;
  return `₹${(job.amount_paise / 100).toFixed(2)}`;
}

export function getJobDocumentFilenames(job: PrintJob): string[] | undefined {
  if (job.document_filenames && job.document_filenames.length > 1) {
    return job.document_filenames;
  }
  if ((job.document_count ?? 1) > 1 && job.documents && job.documents.length > 1) {
    return job.documents.map((doc) => doc.original_filename);
  }
  return undefined;
}
