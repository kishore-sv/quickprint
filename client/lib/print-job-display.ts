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

export function formatJobSummary(job: PrintJob): string {
  const pages = job.page_count;
  const pageLabel = `${pages} page${pages === 1 ? "" : "s"}`;
  const copiesLabel = `${job.copies} copy${job.copies === 1 ? "" : "es"}`;
  const sides = job.duplex === "DOUBLE" ? "both sides" : "single side";
  return `${pageLabel} · ${copiesLabel} · ${sides}`;
}

export function formatJobAmount(job: PrintJob): string | null {
  if (job.amount_paise == null) return null;
  return `₹${(job.amount_paise / 100).toFixed(2)}`;
}
