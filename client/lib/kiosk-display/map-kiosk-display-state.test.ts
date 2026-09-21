import { describe, expect, test } from "bun:test";
import {
  applyDisplayEvent,
  buildProgressSteps,
  reconcileDisplayState,
  shouldReturnToIdle,
} from "./map-kiosk-display-state";
import type { KioskDisplayViewState } from "./types";

const mockPrinter = {
  display_state: "READY",
  connection_state: "ONLINE",
  operational_state: "IDLE",
  reasons: [] as string[],
  telemetry_fresh: true,
  updated_at: new Date().toISOString(),
};

const base: KioskDisplayViewState = {
  state: "IDLE",
  kioskCode: "KIOSK-001",
  kioskName: "Development Kiosk",
  scanUrl: "http://localhost:3000/scan/tok",
  jobId: null,
  updatedAt: new Date().toISOString(),
  printer: null,
};

describe("kiosk display state transitions", () => {
  test("IDLE -> RECEIVED", () => {
    const next = applyDisplayEvent(base, {
      type: "kiosk.job.status",
      kioskCode: "KIOSK-001",
      jobId: "job-1",
      status: "RECEIVED",
      updatedAt: new Date().toISOString(),
    });
    expect(next.state).toBe("RECEIVED");
    expect(next.jobId).toBe("job-1");
  });

  test("RECEIVED -> PREPARED -> PRINTING -> COMPLETED", () => {
    let view = applyDisplayEvent(base, {
      type: "kiosk.job.status",
      kioskCode: "KIOSK-001",
      jobId: "job-1",
      status: "RECEIVED",
      updatedAt: new Date().toISOString(),
    });
    view = applyDisplayEvent(view, {
      type: "kiosk.job.status",
      kioskCode: "KIOSK-001",
      jobId: "job-1",
      status: "PREPARED",
      updatedAt: new Date().toISOString(),
    });
    expect(view.state).toBe("PREPARED");

    view = applyDisplayEvent(view, {
      type: "kiosk.job.status",
      kioskCode: "KIOSK-001",
      jobId: "job-1",
      status: "PRINTING",
      updatedAt: new Date().toISOString(),
    });
    expect(view.state).toBe("PRINTING");

    view = applyDisplayEvent(view, {
      type: "kiosk.job.status",
      kioskCode: "KIOSK-001",
      jobId: "job-1",
      status: "COMPLETED",
      updatedAt: new Date().toISOString(),
    });
    expect(view.state).toBe("COMPLETED");
  });

  test("FAILED state", () => {
    const view = applyDisplayEvent(base, {
      type: "kiosk.job.status",
      kioskCode: "KIOSK-001",
      jobId: "job-1",
      status: "FAILED",
      updatedAt: new Date().toISOString(),
    });
    expect(view.state).toBe("FAILED");
  });
});

describe("reconciliation", () => {
  test("missed PRINTING event recovered from server state", () => {
    const reconciled = reconcileDisplayState(base, {
      kioskCode: "KIOSK-001",
      kioskName: "Development Kiosk",
      scanUrl: "http://localhost:3000/scan/tok",
      state: "PRINTING",
      jobId: "job-1",
      updatedAt: new Date().toISOString(),
      printer: mockPrinter,
    });
    expect(reconciled.state).toBe("PRINTING");
    expect(reconciled.jobId).toBe("job-1");
  });

  test("stale completed returns to IDLE", () => {
    const old = new Date(Date.now() - 10_000).toISOString();
    const reconciled = reconcileDisplayState(
      { ...base, state: "COMPLETED", jobId: "job-1", updatedAt: old },
      {
        kioskCode: "KIOSK-001",
        kioskName: "Development Kiosk",
        scanUrl: "http://localhost:3000/scan/tok",
        state: "COMPLETED",
        jobId: "job-1",
        updatedAt: old,
        printer: mockPrinter,
      }
    );
    expect(reconciled.state).toBe("IDLE");
    expect(reconciled.jobId).toBeNull();
  });

  test("shouldReturnToIdle after completion timeout", () => {
    const old = new Date(Date.now() - 6000).toISOString();
    expect(shouldReturnToIdle("COMPLETED", old)).toBe(true);
    expect(shouldReturnToIdle("COMPLETED", new Date().toISOString())).toBe(false);
  });

  test("server IDLE clears local job state", () => {
    const reconciled = reconcileDisplayState(
      { ...base, state: "PREPARED", jobId: "job-1", updatedAt: new Date().toISOString() },
      {
        kioskCode: "KIOSK-001",
        kioskName: "Development Kiosk",
        scanUrl: "http://localhost:3000/scan/tok",
        state: "IDLE",
        jobId: null,
        updatedAt: new Date().toISOString(),
        printer: mockPrinter,
      }
    );
    expect(reconciled.state).toBe("IDLE");
    expect(reconciled.jobId).toBeNull();
  });

  test("reconnect with no active job returns IDLE", () => {
    const reconciled = reconcileDisplayState(
      { ...base, state: "PRINTING", jobId: "job-1", updatedAt: new Date().toISOString() },
      {
        kioskCode: "KIOSK-001",
        kioskName: "Development Kiosk",
        scanUrl: "http://localhost:3000/scan/tok",
        state: "IDLE",
        jobId: null,
        updatedAt: new Date().toISOString(),
        printer: mockPrinter,
      }
    );
    expect(reconciled.state).toBe("IDLE");
    expect(reconciled.jobId).toBeNull();
  });

  test("refresh after completed job returns IDLE", () => {
    const old = new Date(Date.now() - 10_000).toISOString();
    const reconciled = reconcileDisplayState(
      { ...base, state: "COMPLETED", jobId: "job-1", updatedAt: old },
      {
        kioskCode: "KIOSK-001",
        kioskName: "Development Kiosk",
        scanUrl: "http://localhost:3000/scan/tok",
        state: "IDLE",
        jobId: null,
        updatedAt: new Date().toISOString(),
        printer: mockPrinter,
      }
    );
    expect(reconciled.state).toBe("IDLE");
    expect(reconciled.jobId).toBeNull();
  });

  test("stale failed server state returns to IDLE", () => {
    const old = new Date(Date.now() - 10_000).toISOString();
    const reconciled = reconcileDisplayState(base, {
      kioskCode: "KIOSK-001",
      kioskName: "Development Kiosk",
      scanUrl: "http://localhost:3000/scan/tok",
      state: "FAILED",
      jobId: "job-1",
      updatedAt: old,
      printer: mockPrinter,
    });
    expect(reconciled.state).toBe("IDLE");
    expect(reconciled.jobId).toBeNull();
  });
});

describe("progress steps", () => {
  test("COMPLETED marks all steps done", () => {
    const steps = buildProgressSteps("COMPLETED");
    expect(steps.every((s) => s.status === "completed")).toBe(true);
  });

  test("PRINTING highlights printing step", () => {
    const steps = buildProgressSteps("PRINTING");
    const printing = steps.find((s) => s.key === "printing");
    expect(printing?.status).toBe("current");
    expect(steps.find((s) => s.key === "received")?.status).toBe("completed");
  });
});
