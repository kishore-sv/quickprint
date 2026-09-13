import type { PrintJobStatus } from "../types/enums";

/** Canonical user-facing lifecycle (derived from DB status + pi_phase). */
export type LifecycleStatus =
  | "AWAITING_PAYMENT"
  | "QUEUED"
  | "RECEIVED"
  | "DOWNLOADING"
  | "READY"
  | "PRINTING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";

export const LIFECYCLE_STATUS_LABELS: Record<LifecycleStatus, string> = {
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

/** Pi-reported phase keys in forward order (monotonic). */
export const PI_PHASE_RANK: Record<string, number> = {
  RECEIVED: 1,
  DOWNLOADING: 2,
  READY: 3,
  SUBMITTED: 4,
  PRINTING: 5,
  COMPLETED: 6,
  FAILED: 99,
};

/** DB status rank for coarse monotonic checks (CLAIMED = Pi received). */
export const DB_STATUS_RANK: Record<string, number> = {
  CREATED: 0,
  PAYMENT_PENDING: 1,
  PAID: 2,
  QUEUED: 3,
  CLAIMED: 4,
  DOWNLOADING: 5,
  PRINTING: 6,
  COMPLETED: 7,
  FAILED: 7,
  CANCELLED: 7,
  EXPIRED: 7,
};

export function piPhaseRank(phase: string | null | undefined): number {
  if (!phase) return 0;
  return PI_PHASE_RANK[phase.toUpperCase()] ?? 0;
}

export function dbStatusRank(status: string): number {
  return DB_STATUS_RANK[status] ?? 0;
}

/** Map Pi phase key → DB status (schema unchanged; pi_phase holds READY, etc.). */
export const PI_PHASE_TO_DB_STATUS: Record<string, PrintJobStatus> = {
  RECEIVED: "CLAIMED",
  DOWNLOADING: "DOWNLOADING",
  READY: "DOWNLOADING",
  SUBMITTED: "PRINTING",
  PRINTING: "PRINTING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
};

export function isTerminalLifecycleStatus(status: LifecycleStatus): boolean {
  return (
    status === "COMPLETED" ||
    status === "FAILED" ||
    status === "CANCELLED" ||
    status === "EXPIRED"
  );
}
