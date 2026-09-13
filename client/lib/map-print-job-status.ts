import type { DisplayStatus, PrintJob, PrintJobDetail } from "@/lib/types";

/** Canonical user-facing labels — must match backend LIFECYCLE_STATUS_LABELS. */
export const PRINT_JOB_STATUS_LABELS: Record<DisplayStatus, string> = {
  AWAITING_PAYMENT: "Needs payment",
  QUEUED: "In queue",
  RECEIVED: "Kiosk received",
  DOWNLOADING: "Downloading",
  READY: "File prepared",
  PRINTING: "Printing",
  COMPLETED: "Printed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

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
