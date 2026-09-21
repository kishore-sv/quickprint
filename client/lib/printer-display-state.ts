import type { PrintJobDetail } from "@/lib/types";

/** Human labels for backend `printer_display_state` / kiosk printer snapshot. */

export function printerDisplayStateLabel(state: string | null | undefined): string | null {
  if (!state) return null;
  switch (state) {
    case "READY":
      return "Printer ready";
    case "PRINTING":
      return "Printer printing";
    case "OFFLINE":
      return "Printer offline";
    case "ERROR":
      return "Printer error";
    case "PAPER_OUT":
      return "Paper out";
    case "PAPER_JAM":
      return "Paper jam";
    case "TONER_LOW":
      return "Toner low";
    case "TELEMETRY_STALE":
      return "Printer status unavailable";
    case "UNKNOWN":
      return "Printer status unknown";
    default:
      return null;
  }
}

type CustomerPrinterSnapshot = NonNullable<PrintJobDetail["printer"]>;

/** Muted printer line on customer print-job status (not derived from job steps). */
export function customerPrintJobPrinterLine(
  job: Pick<PrintJobDetail, "printer" | "printer_display_state" | "kiosk_service_online" | "is_terminal">
): string | null {
  const snapshot: CustomerPrinterSnapshot | null | undefined =
    job.printer ??
    (job.printer_display_state
      ? {
          display_state: job.printer_display_state,
          connection_state: "UNKNOWN",
          operational_state: "UNKNOWN",
          telemetry_fresh: false,
          telemetry_last_seen_at: null,
        }
      : null);

  if (!snapshot) {
    return null;
  }

  const { display_state, telemetry_fresh } = snapshot;
  const kioskOnline = job.kiosk_service_online === true;

  if (display_state === "TELEMETRY_STALE") {
    if (kioskOnline) {
      return null;
    }
    return printerDisplayStateLabel("TELEMETRY_STALE");
  }

  if (!telemetry_fresh) {
    return null;
  }

  if (display_state === "UNKNOWN") {
    return null;
  }

  if (display_state === "READY") {
    if (job.is_terminal) {
      return printerDisplayStateLabel("READY");
    }
    return null;
  }

  if (job.is_terminal && display_state === "PRINTING") {
    return printerDisplayStateLabel("READY");
  }

  return printerDisplayStateLabel(display_state);
}
