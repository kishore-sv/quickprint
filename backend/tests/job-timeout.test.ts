import { describe, expect, test } from "bun:test";
import { resolveDisplayStatus } from "../src/services/print-job-display.service";

describe("job timeout (logic)", () => {
  test("stuck queued job is not terminal until timeout applied", () => {
    const job = {
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
    expect(resolveDisplayStatus(job)).toBe("QUEUED");
  });

  test("failed with timeout error code", () => {
    const job = {
      status: "FAILED",
      paymentStatus: "PAID",
      piPhase: "FAILED",
      dispatchedAt: new Date(),
      userErrorCode: "JOB_TIMEOUT",
      paidAt: new Date(),
      completedAt: null,
      failedAt: new Date(),
      lastPiEventAt: new Date(),
      createdAt: new Date(),
    };
    expect(resolveDisplayStatus(job)).toBe("FAILED");
  });
});
