import type { InferSelectModel } from "drizzle-orm";
import type { printJobs } from "../db/schema";
import { safeMessageForErrorCode } from "../utils/print-errors";
import {
  type LifecycleStatus,
  LIFECYCLE_STATUS_LABELS,
  isTerminalLifecycleStatus,
} from "./print-job-lifecycle";

export type DisplayStatus = LifecycleStatus;

export type JobStepKey =
  | "payment"
  | "queued"
  | "received"
  | "preparing"
  | "printing"
  | "printed";

export type JobStep = {
  key: JobStepKey;
  done: boolean;
  active?: boolean;
  failed?: boolean;
};

type JobLike = {
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

export function resolveDisplayStatus(job: JobLike): DisplayStatus {
  if (job.status === "CANCELLED") return "CANCELLED";
  if (job.status === "EXPIRED") return "EXPIRED";
  if (job.paymentStatus !== "PAID") {
    return "AWAITING_PAYMENT";
  }
  if (job.status === "COMPLETED") return "COMPLETED";
  if (job.status === "FAILED") return "FAILED";

  const phase = job.piPhase?.toUpperCase() ?? null;

  if (phase === "COMPLETED") return "COMPLETED";
  if (phase === "FAILED") return "FAILED";
  if (phase === "PRINTING" || phase === "SUBMITTED" || job.status === "PRINTING") {
    return "PRINTING";
  }
  if (phase === "READY") return "READY";
  if (phase === "DOWNLOADING" || job.status === "DOWNLOADING") return "DOWNLOADING";
  if (phase === "RECEIVED") return "RECEIVED";
  // Legacy rows: CLAIMED before dispatch fix may lack pi_phase
  if (job.status === "CLAIMED") return "RECEIVED";

  return "QUEUED";
}

export function displayLabel(status: DisplayStatus): string {
  return LIFECYCLE_STATUS_LABELS[status];
}

export function displayMessage(
  job: JobLike,
  options?: {
    kioskServiceOnline?: boolean | null;
    kioskCode?: string | null;
    kioskName?: string | null;
  }
): string | null {
  const status = resolveDisplayStatus(job);

  if (status === "COMPLETED") {
    const kiosk = options?.kioskCode ?? options?.kioskName;
    if (kiosk) {
      return `Your print is ready at ${kiosk}. Please collect it from the tray.`;
    }
    return "Your document has been printed successfully.";
  }
  if (status === "FAILED") {
    return safeMessageForErrorCode(job.userErrorCode);
  }
  if (status === "CANCELLED") {
    return "This print job was cancelled.";
  }
  if (status === "EXPIRED") {
    return "This print job has expired.";
  }
  if (
    status === "QUEUED" &&
    job.paymentStatus === "PAID" &&
    options?.kioskServiceOnline === false
  ) {
    return "Your payment was successful. Kiosk temporarily unavailable. Your print will start when the kiosk reconnects.";
  }
  if (status === "PRINTING") {
    return "Your document is being printed.";
  }
  if (status === "READY") {
    return "Your file is prepared and printing will begin shortly.";
  }
  if (status === "DOWNLOADING") {
    return "Your file is being downloaded at the kiosk.";
  }
  if (status === "RECEIVED") {
    return "The kiosk has received your print job.";
  }
  if (status === "QUEUED") {
    if (job.dispatchedAt) {
      return "Your job was sent to the kiosk and is waiting to be received.";
    }
    return "Scan the kiosk QR code to start printing.";
  }
  return null;
}

const STEP_ORDER: JobStepKey[] = [
  "payment",
  "queued",
  "received",
  "preparing",
  "printing",
  "printed",
];

const STATUS_TO_STEP: Record<DisplayStatus, JobStepKey> = {
  AWAITING_PAYMENT: "payment",
  QUEUED: "queued",
  RECEIVED: "received",
  DOWNLOADING: "preparing",
  READY: "preparing",
  PRINTING: "printing",
  COMPLETED: "printed",
  FAILED: "printing",
  CANCELLED: "queued",
  EXPIRED: "queued",
};

export function buildJobSteps(job: JobLike): JobStep[] {
  const display = resolveDisplayStatus(job);
  const activeKey = STATUS_TO_STEP[display];
  const activeIndex = STEP_ORDER.indexOf(activeKey);

  return STEP_ORDER.map((key, index) => {
    if (display === "COMPLETED") {
      return { key, done: true };
    }
    if (display === "FAILED") {
      return {
        key,
        done: index < STEP_ORDER.indexOf("printing"),
        failed: key === "printing",
      };
    }
    if (display === "CANCELLED" || display === "EXPIRED") {
      return { key, done: index <= STEP_ORDER.indexOf("queued") };
    }
    return {
      key,
      done: index < activeIndex,
      active: index === activeIndex,
    };
  });
}

export function jobUpdatedAt(job: JobLike): Date {
  return (
    job.completedAt ??
    job.failedAt ??
    job.lastPiEventAt ??
    job.paidAt ??
    job.createdAt
  );
}

export function isTerminalDisplayStatus(status: DisplayStatus): boolean {
  return isTerminalLifecycleStatus(status);
}

export function enrichJobForClient(
  job: InferSelectModel<typeof printJobs>,
  options?: { kioskName?: string | null; kioskServiceOnline?: boolean | null }
) {
  const displayStatus = resolveDisplayStatus(job);
  const label = displayLabel(displayStatus);
  const message = displayMessage(job, options);
  const steps = buildJobSteps(job);

  return {
    ...job,
    display_status: displayStatus,
    display_label: label,
    display_message: message,
    steps,
    pi_phase: job.piPhase ?? null,
    user_error_code: job.userErrorCode ?? null,
    kiosk_name: options?.kioskName ?? null,
    kiosk_service_online: options?.kioskServiceOnline ?? null,
    updated_at: jobUpdatedAt(job),
  };
}
