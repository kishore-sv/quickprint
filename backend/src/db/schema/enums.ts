import { pgEnum } from "drizzle-orm/pg-core";

export const kioskStatusEnum = pgEnum("kioskstatus", ["ACTIVE", "INACTIVE", "MAINTENANCE"]);
export const colorModeEnum = pgEnum("colormode", ["BW", "COLOR"]);
export const paperSizeEnum = pgEnum("papersize", ["A4"]);
export const duplexModeEnum = pgEnum("duplexmode", ["SINGLE", "DOUBLE"]);
export const pageOrderEnum = pgEnum("pageorder", ["NORMAL", "REVERSE"]);
export const orientationEnum = pgEnum("orientation", ["AUTO", "PORTRAIT", "LANDSCAPE"]);
export const printJobStatusEnum = pgEnum("printjobstatus", [
  "CREATED",
  "PAYMENT_PENDING",
  "PAID",
  "QUEUED",
  "CLAIMED",
  "DOWNLOADING",
  "PRINTING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
]);
export const paymentStatusEnum = pgEnum("paymentstatus", [
  "UNPAID",
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
]);
export const paymentRecordStatusEnum = pgEnum("paymentrecordstatus", [
  "CREATED",
  "SUCCESS",
  "FAILED",
]);
export const refundStatusEnum = pgEnum("refundstatus", ["PROCESSING", "REFUNDED", "FAILED"]);
