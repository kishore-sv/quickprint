import { describe, expect, test } from "bun:test";
import {
  PrinterDisplayState,
  ConnectionState,
  OperationalState,
} from "../src/types/printer-telemetry";
import {
  serializeKioskPrinterForCustomer,
} from "../src/services/printer-telemetry.service";
import { serializePrintJobDetail } from "../src/utils/serializers";
import type { printJobs } from "../src/db/schema";
import type { InferSelectModel } from "drizzle-orm";

describe("serializeKioskPrinterForCustomer", () => {
  test("maps resolved telemetry for print job API", () => {
    const snapshot = serializeKioskPrinterForCustomer({
      printer_name: "HP",
      connection_state: ConnectionState.ONLINE,
      operational_state: OperationalState.PRINTING,
      display_state: PrinterDisplayState.PRINTING,
      reasons: [],
      raw_reasons: [],
      capabilities: null,
      telemetry_fresh: true,
      telemetry_last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    expect(snapshot.display_state).toBe("PRINTING");
    expect(snapshot.telemetry_fresh).toBe(true);
    expect(snapshot.operational_state).toBe("PRINTING");
  });
});

describe("serializePrintJobDetail printer snapshot", () => {
  const minimalJob = {
    id: "job-1",
    userId: "u1",
    status: "PRINTING",
    paymentStatus: "PAID",
    piPhase: "PRINTING",
    jobNumber: "QP-1",
    kioskId: "k1",
    dispatchedAt: new Date(),
    paidAt: new Date(),
    completedAt: null,
    failedAt: null,
    lastPiEventAt: new Date(),
    createdAt: new Date(),
    userErrorCode: null,
    cleanupStatus: null,
  } as InferSelectModel<typeof printJobs>;

  test("includes printer object when provided", () => {
    const printer = serializeKioskPrinterForCustomer({
      printer_name: null,
      connection_state: ConnectionState.ONLINE,
      operational_state: OperationalState.PRINTING,
      display_state: PrinterDisplayState.PRINTING,
      reasons: [],
      raw_reasons: [],
      capabilities: null,
      telemetry_fresh: true,
      telemetry_last_seen_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    const detail = serializePrintJobDetail(minimalJob, {
      kioskName: "Kiosk",
      kioskCode: "K1",
      kioskServiceOnline: true,
      printerDisplayState: printer.display_state,
      printer,
    });
    expect(detail.printer?.display_state).toBe("PRINTING");
    expect(detail.printer_display_state).toBe("PRINTING");
    expect(detail.printer?.telemetry_fresh).toBe(true);
  });
});
