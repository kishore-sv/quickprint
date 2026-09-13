import type { JobStep, PrintJobDetail } from "@/lib/types";
import { isPrintJobTerminal, mapPrintJobStatus } from "@/lib/map-print-job-status";

export const STEP_LABELS: Record<JobStep["key"], string> = {
  payment: "Payment successful",
  queued: "In queue",
  received: "Kiosk received",
  preparing: "File prepared",
  printing: "Printing",
  printed: "Printed",
};

export function isTerminalJob(job: PrintJobDetail | null): boolean {
  return isPrintJobTerminal(job);
}

export { mapPrintJobStatus } from "@/lib/map-print-job-status";
