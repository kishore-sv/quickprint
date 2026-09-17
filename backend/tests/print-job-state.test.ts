import { describe, expect, test } from "bun:test";
import { canTransitionStatus } from "../src/services/print-job.service";

describe("print job state machine", () => {
  test("CREATED to PAYMENT_PENDING", () => {
    expect(canTransitionStatus("CREATED", "PAYMENT_PENDING")).toBe(true);
  });

  test("CREATED cannot jump to QUEUED", () => {
    expect(canTransitionStatus("CREATED", "QUEUED")).toBe(false);
  });

  test("QUEUED to CLAIMED", () => {
    expect(canTransitionStatus("QUEUED", "CLAIMED")).toBe(true);
  });

  test("COMPLETED is terminal", () => {
    expect(canTransitionStatus("COMPLETED", "QUEUED")).toBe(false);
  });

  test("DOWNLOADING to CANCELLED", () => {
    expect(canTransitionStatus("DOWNLOADING", "CANCELLED")).toBe(true);
  });
});
