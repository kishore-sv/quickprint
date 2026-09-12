import type { PrintJob } from "@/lib/types";

const TERMINAL_STATUSES = new Set(["CANCELLED", "FAILED", "COMPLETED", "EXPIRED"]);

export function jobNeedsPayment(job: PrintJob): boolean {
  if (job.payment_status === "PAID") return false;
  return !TERMINAL_STATUSES.has(job.status);
}

export function jobInQueue(job: PrintJob): boolean {
  if (job.payment_status !== "PAID") return false;
  if (job.claimed_at) return false;
  return job.status === "QUEUED" || job.status === "PAID";
}

/** Paid, not yet released at a kiosk — show on Home and Scan */
export function jobReadyForKioskRelease(job: PrintJob): boolean {
  return jobInQueue(job);
}

export function isActiveJob(job: PrintJob): boolean {
  return jobNeedsPayment(job) || jobInQueue(job);
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
