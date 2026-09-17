import { describe, expect, test } from "bun:test";
import { isJobCancellable } from "../src/services/cancellability";

const base = {
  piPhase: null,
  dispatchedAt: null,
  userErrorCode: null,
  paidAt: new Date(),
  completedAt: null,
  failedAt: null,
  lastPiEventAt: null,
  createdAt: new Date(),
};

describe("isJobCancellable", () => {
  test("paid queued job is cancellable", () => {
    expect(
      isJobCancellable({
        ...base,
        status: "QUEUED",
        paymentStatus: "PAID",
      })
    ).toEqual({ cancellable: true, paid: true, alreadyCancelled: false });
  });

  test("paid printing job is not cancellable", () => {
    expect(
      isJobCancellable({
        ...base,
        status: "PRINTING",
        paymentStatus: "PAID",
        piPhase: "PRINTING",
      }).cancellable
    ).toBe(false);
  });

  test("completed job is not cancellable", () => {
    expect(
      isJobCancellable({
        ...base,
        status: "COMPLETED",
        paymentStatus: "PAID",
        completedAt: new Date(),
      }).cancellable
    ).toBe(false);
  });

  test("already cancelled is idempotent", () => {
    expect(
      isJobCancellable({
        ...base,
        status: "CANCELLED",
        paymentStatus: "PAID",
      })
    ).toEqual({ cancellable: true, paid: true, alreadyCancelled: true });
  });

  test("unpaid created job is cancellable without refund", () => {
    expect(
      isJobCancellable({
        ...base,
        status: "CREATED",
        paymentStatus: "UNPAID",
        paidAt: null,
      })
    ).toEqual({ cancellable: true, paid: false, alreadyCancelled: false });
  });

  test("paid received at kiosk is cancellable", () => {
    expect(
      isJobCancellable({
        ...base,
        status: "CLAIMED",
        paymentStatus: "PAID",
        piPhase: "RECEIVED",
        dispatchedAt: new Date(),
      }).cancellable
    ).toBe(true);
  });
});
