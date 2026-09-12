export type ColorMode = "BW" | "COLOR";
export type PaperSize = "A4";
export type DuplexMode = "SINGLE" | "DOUBLE";
export type PageOrder = "NORMAL" | "REVERSE";
export type Orientation = "AUTO" | "PORTRAIT" | "LANDSCAPE";
export type PrintJobStatus =
  | "CREATED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "QUEUED"
  | "CLAIMED"
  | "DOWNLOADING"
  | "PRINTING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";
export type PaymentStatus = "UNPAID" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type PaymentRecordStatus = "CREATED" | "SUCCESS" | "FAILED";
export type KioskStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export const PrintJobEventType = {
  JOB_CREATED: "JOB_CREATED",
  PAYMENT_CREATED: "PAYMENT_CREATED",
  PAYMENT_SUCCESS: "PAYMENT_SUCCESS",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  QUEUED: "QUEUED",
  KIOSK_SELECTED: "KIOSK_SELECTED",
  PRINT_REQUESTED: "PRINT_REQUESTED",
  PRINTING_STARTED: "PRINTING_STARTED",
  PRINT_COMPLETED: "PRINT_COMPLETED",
  PRINT_FAILED: "PRINT_FAILED",
  FILE_DELETED: "FILE_DELETED",
  CANCELLED: "CANCELLED",
} as const;
