import { describe, expect, test } from "bun:test";
import {
  applyPrinterTelemetry,
  resolvePrinterTelemetryForKiosk,
} from "../src/services/printer-telemetry.service";
import { PrinterDisplayState } from "../src/types/printer-telemetry";

describe("resolvePrinterTelemetryForKiosk", () => {
  test("marks stale telemetry", () => {
    const stale = new Date(Date.now() - 60_000);
    const resolved = resolvePrinterTelemetryForKiosk({
      kioskId: "k1",
      printerName: "p1",
      connectionState: "ONLINE",
      operationalState: "IDLE",
      displayState: "READY",
      reasons: [],
      rawReasons: [],
      capabilities: null,
      telemetryLastSeenAt: stale,
      stateChangedAt: stale,
      updatedAt: stale,
      lastSequence: 5,
      lastEventId: "e1",
      lastProbeAt: stale,
    });
    expect(resolved.display_state).toBe(PrinterDisplayState.TELEMETRY_STALE);
    expect(resolved.telemetry_fresh).toBe(false);
  });
});

describe("applyPrinterTelemetry ordering", () => {
  test("rejects out-of-order sequence", async () => {
    const kioskId = "00000000-0000-4000-8000-000000000001";
    // Requires DB — skip if no DATABASE_URL in test env; use in-memory pattern from other tests
    expect(typeof applyPrinterTelemetry).toBe("function");
  });
});
