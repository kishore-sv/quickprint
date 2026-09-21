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
