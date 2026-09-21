import { beforeEach, describe, expect, mock, test } from "bun:test";
import { PrinterDisplayState } from "../src/types/printer-telemetry";

type ResolvedTelemetry = {
  display_state: string;
  telemetry_fresh: boolean;
  telemetry_last_seen_at: Date | null;
};

let resolvedTelemetry: ResolvedTelemetry = {
  display_state: PrinterDisplayState.TELEMETRY_STALE,
  telemetry_fresh: false,
  telemetry_last_seen_at: new Date(Date.now() - 60_000),
};

let agentSocketOnline = true;

mock.module("../src/services/printer-telemetry.service", () => ({
  resolvePrinterTelemetryByKioskId: async () => resolvedTelemetry,
}));

mock.module("../src/ws/kiosk-agent.registry", () => ({
  getKioskAgentRegistry: () => ({
    isOnline: () => agentSocketOnline,
  }),
}));

const { serializeKioskServiceStatus } = await import("../src/services/kiosk-status.service");

const mockKiosk = {
  id: "kiosk-1",
  name: "Test",
  kioskCode: "T1",
  location: null,
  lastSeenAt: new Date(),
} as const;

describe("serializeKioskServiceStatus printer message", () => {
  beforeEach(() => {
    agentSocketOnline = true;
    resolvedTelemetry = {
      display_state: PrinterDisplayState.TELEMETRY_STALE,
      telemetry_fresh: false,
      telemetry_last_seen_at: new Date(Date.now() - 60_000),
    };
  });

  test("TELEMETRY_STALE with agent online has no alarming message", async () => {
    const status = await serializeKioskServiceStatus(mockKiosk);
    expect(status.service.online).toBe(true);
    expect(status.printer?.message).toBeNull();
  });

  test("TELEMETRY_STALE with agent offline keeps unavailable message", async () => {
    agentSocketOnline = false;
    const status = await serializeKioskServiceStatus(mockKiosk);
    expect(status.service.online).toBe(false);
    expect(status.printer?.message).toBe("Printer status is temporarily unavailable.");
  });
});
