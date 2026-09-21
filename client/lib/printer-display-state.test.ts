import { describe, expect, test } from "bun:test";
import { customerPrintJobPrinterLine } from "./printer-display-state";
import type { PrintJobDetail } from "./types";

function job(
  overrides: Partial<PrintJobDetail> & Pick<PrintJobDetail, "printer" | "kiosk_service_online">
): PrintJobDetail {
  return {
    id: "j1",
    job_number: "QP-1",
    status: "PRINTING",
    ...overrides,
  } as PrintJobDetail;
}

describe("customerPrintJobPrinterLine", () => {
  test("fresh PRINTING shows Printer printing", () => {
    const line = customerPrintJobPrinterLine(
      job({
        kiosk_service_online: true,
        printer: {
          display_state: "PRINTING",
          connection_state: "ONLINE",
          operational_state: "PRINTING",
          telemetry_fresh: true,
          telemetry_last_seen_at: new Date().toISOString(),
        },
      })
    );
    expect(line).toBe("Printer printing");
  });

  test("TELEMETRY_STALE with kiosk online suppresses line", () => {
    const line = customerPrintJobPrinterLine(
      job({
        kiosk_service_online: true,
        printer: {
          display_state: "TELEMETRY_STALE",
          connection_state: "ONLINE",
          operational_state: "PRINTING",
          telemetry_fresh: false,
          telemetry_last_seen_at: null,
        },
      })
    );
    expect(line).toBeNull();
  });

  test("TELEMETRY_STALE with kiosk offline shows unavailable", () => {
    const line = customerPrintJobPrinterLine(
      job({
        kiosk_service_online: false,
        printer: {
          display_state: "TELEMETRY_STALE",
          connection_state: "UNKNOWN",
          operational_state: "UNKNOWN",
          telemetry_fresh: false,
          telemetry_last_seen_at: null,
        },
      })
    );
    expect(line).toBe("Printer status unavailable");
  });

  test("fresh READY after terminal job shows Printer ready", () => {
    const line = customerPrintJobPrinterLine(
      job({
        kiosk_service_online: true,
        is_terminal: true,
        printer: {
          display_state: "READY",
          connection_state: "ONLINE",
          operational_state: "IDLE",
          telemetry_fresh: true,
          telemetry_last_seen_at: new Date().toISOString(),
        },
      })
    );
    expect(line).toBe("Printer ready");
  });
});
