import type { KioskDisplayPrinterSnapshot } from "./types";

export function printerBannerLabel(
  printer: KioskDisplayPrinterSnapshot | null | undefined
): string | null {
  if (!printer) return null;
  switch (printer.display_state) {
    case "READY":
      return "Printer ready";
    case "PRINTING":
      return "Printing";
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
    case "TONER_OUT":
      return "Toner out";
    case "COVER_OPEN":
      return "Cover open";
    case "PAUSED":
      return "Printer paused";
    case "DISABLED":
      return "Printer disabled";
    case "TELEMETRY_STALE":
      return "Printer status unknown";
    case "UNKNOWN":
      return "Printer status unknown";
    default:
      return null;
  }
}

export function printerBannerTone(
  printer: KioskDisplayPrinterSnapshot | null | undefined
): "ok" | "warn" | "error" | "muted" {
  if (!printer) return "muted";
  switch (printer.display_state) {
    case "READY":
    case "PRINTING":
      return "ok";
    case "UNKNOWN":
    case "TELEMETRY_STALE":
      return "muted";
    case "TONER_LOW":
    case "PAUSED":
      return "warn";
    default:
      return "error";
  }
}
