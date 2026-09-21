import { describe, expect, mock, test } from "bun:test";
import {
  acceptTelemetrySequence,
  onAgentTelemetrySessionStart,
  resolvePrinterTelemetryForKiosk,
} from "../src/services/printer-telemetry.service";
import { PrinterDisplayState, ConnectionState } from "../src/types/printer-telemetry";

describe("resolvePrinterTelemetryForKiosk", () => {
  test("marks stale telemetry without claiming printer offline", () => {
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
    expect(resolved.connection_state).toBe(ConnectionState.ONLINE);
    expect(resolved.telemetry_fresh).toBe(false);
  });

  test("fresh telemetry preserves display state", () => {
    const now = new Date();
    const resolved = resolvePrinterTelemetryForKiosk({
      kioskId: "k1",
      printerName: "p1",
      connectionState: "ONLINE",
      operationalState: "PRINTING",
      displayState: "PRINTING",
      reasons: [],
      rawReasons: [],
      capabilities: null,
      telemetryLastSeenAt: now,
      stateChangedAt: now,
      updatedAt: now,
      lastSequence: 10,
      lastEventId: "e2",
      lastProbeAt: now,
    });
    expect(resolved.display_state).toBe(PrinterDisplayState.PRINTING);
    expect(resolved.telemetry_fresh).toBe(true);
  });
});

describe("acceptTelemetrySequence", () => {
  test("rejects duplicate or older sequence", () => {
    expect(acceptTelemetrySequence(103, 102)).toBe(false);
    expect(acceptTelemetrySequence(103, 103)).toBe(false);
    expect(acceptTelemetrySequence(103, 104)).toBe(true);
    expect(acceptTelemetrySequence(null, 1)).toBe(true);
  });

  test("accepts sequence 1 after session reset (lastSequence 0)", () => {
    expect(acceptTelemetrySequence(100, 1)).toBe(false);
    expect(acceptTelemetrySequence(0, 1)).toBe(true);
  });
});

describe("onAgentTelemetrySessionStart", () => {
  test("resets lastSequence when printer state row exists", async () => {
    const updates: unknown[] = [];
    mock.module("../src/db", () => ({
      db: {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [
                {
                  kioskId: "k1",
                  lastSequence: 120,
                },
              ],
            }),
          }),
        }),
        update: () => ({
          set: (values: unknown) => {
            updates.push(values);
            return {
              where: async () => undefined,
            };
          },
        }),
      },
    }));

    const { onAgentTelemetrySessionStart: resetSession } = await import(
      "../src/services/printer-telemetry.service"
    );
    await resetSession("k1");
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ lastSequence: 0 });
  });
});
