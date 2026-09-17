import type { PrintJobStatus } from "../types/enums";
import { resolveDisplayStatus } from "./print-job-display.service";

export type JobCancellabilityInput = {
  status: string;
  paymentStatus: string;
  piPhase: string | null;
  dispatchedAt: Date | null;
  userErrorCode: string | null;
  paidAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  lastPiEventAt: Date | null;
  createdAt: Date;
};

const UNPAID_CANCELLABLE_STATUSES: PrintJobStatus[] = ["CREATED", "PAYMENT_PENDING", "QUEUED"];
const PAID_CANCELLABLE_STATUSES: PrintJobStatus[] = ["QUEUED", "CLAIMED", "DOWNLOADING"];
const TERMINAL_STATUSES: PrintJobStatus[] = ["COMPLETED", "FAILED", "EXPIRED"];

export function isJobCancellable(job: JobCancellabilityInput): {
  cancellable: boolean;
  paid: boolean;
  alreadyCancelled: boolean;
} {
  if (job.status === "CANCELLED") {
    return { cancellable: true, paid: job.paymentStatus === "PAID", alreadyCancelled: true };
  }

  if (TERMINAL_STATUSES.includes(job.status as PrintJobStatus)) {
    return { cancellable: false, paid: job.paymentStatus === "PAID", alreadyCancelled: false };
  }

  if (job.paymentStatus === "PAID") {
    const display = resolveDisplayStatus(job);
    if (display === "PRINTING" || job.status === "PRINTING") {
      return { cancellable: false, paid: true, alreadyCancelled: false };
    }
    if (
      PAID_CANCELLABLE_STATUSES.includes(job.status as PrintJobStatus) ||
      display === "QUEUED" ||
      display === "RECEIVED" ||
      display === "DOWNLOADING" ||
      display === "READY"
    ) {
      return { cancellable: true, paid: true, alreadyCancelled: false };
    }
    return { cancellable: false, paid: true, alreadyCancelled: false };
  }

  if (UNPAID_CANCELLABLE_STATUSES.includes(job.status as PrintJobStatus)) {
    return { cancellable: true, paid: false, alreadyCancelled: false };
  }

  return { cancellable: false, paid: false, alreadyCancelled: false };
}
