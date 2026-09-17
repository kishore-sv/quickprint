import { PRINT_JOB_STATUS_LABELS } from "@/lib/print-job-status-config";
import type { DisplayStatus, PrintJob, PrintJobDetail } from "@/lib/types";

export { PRINT_JOB_STATUS_LABELS };

export type MappedPrintJobStatus = {
  status: DisplayStatus;
  label: string;
  message: string | null;
  isTerminal: boolean;
};

type JobWithDisplay = Pick<
  PrintJob,
  "display_status" | "display_label" | "display_message" | "payment_status" | "status"
> & {
  is_terminal?: boolean;
};

/**
 * Single client mapper for print-job lifecycle status.
 * Uses backend-derived display_* fields as the source of truth.
 */
export function mapPrintJobStatus(job: JobWithDisplay): MappedPrintJobStatus {
  const status = job.display_status ?? "QUEUED";
  const label = job.display_label ?? PRINT_JOB_STATUS_LABELS[status] ?? status;
  const message = job.display_message ?? null;
  const isTerminal =
    job.is_terminal ??
    (status === "COMPLETED" ||
      status === "FAILED" ||
      status === "CANCELLED" ||
      status === "EXPIRED");

  return { status, label, message, isTerminal };
}

export function isPrintJobTerminal(job: JobWithDisplay | PrintJobDetail | null): boolean {
  if (!job) return false;
  return mapPrintJobStatus(job).isTerminal;
}

/** Paid job waiting to be sent to / received by the kiosk. */
export function isQueuedPrintJob(job: JobWithDisplay): boolean {
  return mapPrintJobStatus(job).status === "QUEUED";
}

/** Paid job actively progressing at the kiosk (after QUEUED). */
export function isActivePrintJobAtKiosk(job: JobWithDisplay): boolean {
  const status = mapPrintJobStatus(job).status;
  return (
    status === "RECEIVED" ||
    status === "DOWNLOADING" ||
    status === "READY" ||
    status === "PRINTING"
  );
}

export function printJobNeedsPayment(job: JobWithDisplay): boolean {
  return mapPrintJobStatus(job).status === "AWAITING_PAYMENT";
}

const PAID_CANCELLABLE_DISPLAY: DisplayStatus[] = [
  "QUEUED",
  "RECEIVED",
  "DOWNLOADING",
  "READY",
];

export function isCancellablePaidJob(job: JobWithDisplay): boolean {
  if (job.status === "CANCELLED") return false;
  if (job.payment_status !== "PAID") return false;
  const display = mapPrintJobStatus(job).status;
  return PAID_CANCELLABLE_DISPLAY.includes(display);
}

export function isCancellableUnpaidJob(job: JobWithDisplay): boolean {
  return mapPrintJobStatus(job).status === "AWAITING_PAYMENT";
}
