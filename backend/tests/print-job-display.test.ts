import { describe, expect, test } from "bun:test";
import {
  buildJobSteps,
  displayLabel,
  displayMessage,
  resolveDisplayStatus,
} from "../src/services/print-job-display.service";
import { LIFECYCLE_STATUS_LABELS } from "../src/services/print-job-lifecycle";

const baseJob = {
  status: "QUEUED",
  paymentStatus: "PAID",
  piPhase: null,
  dispatchedAt: null,
  userErrorCode: null,
  paidAt: new Date(),
  completedAt: null,
  failedAt: null,
  lastPiEventAt: null,
  createdAt: new Date(),
};

describe("print job display", () => {
  test("queued paid job stays queued until pi receives", () => {
    expect(resolveDisplayStatus(baseJob)).toBe("QUEUED");
    expect(resolveDisplayStatus({ ...baseJob, dispatchedAt: new Date() })).toBe("QUEUED");
    expect(displayLabel("QUEUED")).toBe("In queue");
  });

  test("received only after pi phase received", () => {
    expect(
      resolveDisplayStatus({ ...baseJob, status: "CLAIMED", piPhase: "RECEIVED" })
    ).toBe("RECEIVED");
    expect(displayLabel("RECEIVED")).toBe("Kiosk received");
  });

  test("ready phase distinct from downloading", () => {
    expect(
      resolveDisplayStatus({ ...baseJob, status: "DOWNLOADING", piPhase: "DOWNLOADING" })
    ).toBe("DOWNLOADING");
    expect(
      resolveDisplayStatus({ ...baseJob, status: "DOWNLOADING", piPhase: "READY" })
    ).toBe("READY");
    expect(displayLabel("READY")).toBe("File prepared");
  });

  test("printing and completed", () => {
    expect(
      resolveDisplayStatus({ ...baseJob, status: "PRINTING", piPhase: "PRINTING" })
    ).toBe("PRINTING");
    expect(displayLabel("PRINTING")).toBe("Printing");
    expect(
      resolveDisplayStatus({ ...baseJob, status: "COMPLETED", piPhase: "COMPLETED" })
    ).toBe("COMPLETED");
    expect(displayLabel("COMPLETED")).toBe("Printed");
  });

  test("failed label", () => {
    expect(
      resolveDisplayStatus({ ...baseJob, status: "FAILED", piPhase: "FAILED" })
    ).toBe("FAILED");
    expect(displayLabel("FAILED")).toBe("Failed");
  });

  test("completed steps all done", () => {
    const steps = buildJobSteps({ ...baseJob, status: "COMPLETED", piPhase: "COMPLETED" });
    expect(steps.every((s) => s.done)).toBe(true);
  });

  test("failed marks printing as active", () => {
    const steps = buildJobSteps({ ...baseJob, status: "FAILED", userErrorCode: "PRINT_FAILED" });
    const printing = steps.find((s) => s.key === "printing");
    expect(printing?.active).toBe(true);
    expect(printing?.done).toBe(false);
  });

  test("completed message mentions kiosk code for pickup", () => {
    const msg = displayMessage(
      { ...baseJob, status: "COMPLETED", piPhase: "COMPLETED" },
      { kioskCode: "KIOSK-001" }
    );
    expect(msg).toContain("KIOSK-001");
    expect(msg).toContain("collect");
  });

  test("lifecycle labels are unique per canonical status", () => {
    expect(LIFECYCLE_STATUS_LABELS.QUEUED).not.toBe(LIFECYCLE_STATUS_LABELS.READY);
    expect(LIFECYCLE_STATUS_LABELS.COMPLETED).toBe("Printed");
  });
});
