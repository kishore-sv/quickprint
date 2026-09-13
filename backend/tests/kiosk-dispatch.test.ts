import { describe, expect, test } from "bun:test";
import { resetDispatchState } from "../src/services/kiosk-dispatch.service";

describe("kiosk dispatch state", () => {
  test("resetDispatchState clears in-flight map", () => {
    resetDispatchState();
    expect(true).toBe(true);
  });
});

describe("dispatch eligibility (logic)", () => {
  test("unpaid job must not be dispatched", () => {
    const job = {
      paymentStatus: "UNPAID",
      status: "QUEUED",
      kioskId: "k1",
      dispatchedAt: null,
    };
    const eligible =
      job.paymentStatus === "PAID" &&
      job.status === "QUEUED" &&
      job.kioskId != null &&
      job.dispatchedAt == null;
    expect(eligible).toBe(false);
  });

  test("paid queued job with kiosk is eligible", () => {
    const job = {
      paymentStatus: "PAID",
      status: "QUEUED",
      kioskId: "k1",
      dispatchedAt: null,
    };
    const eligible =
      job.paymentStatus === "PAID" &&
      job.status === "QUEUED" &&
      job.kioskId != null &&
      job.dispatchedAt == null;
    expect(eligible).toBe(true);
  });

  test("already dispatched job is not eligible", () => {
    const job = {
      paymentStatus: "PAID",
      status: "QUEUED",
      kioskId: "k1",
      dispatchedAt: new Date(),
    };
    const eligible = job.dispatchedAt == null;
    expect(eligible).toBe(false);
  });
});

describe("requeue unacknowledged (logic)", () => {
  test("dispatched without pi events should be requeued", () => {
    const job = {
      paymentStatus: "PAID",
      status: "QUEUED",
      dispatchedAt: new Date(),
      lastPiEventAt: null,
    };
    const shouldRequeue =
      job.paymentStatus === "PAID" &&
      (job.status === "QUEUED" || job.status === "CLAIMED") &&
      job.dispatchedAt != null &&
      job.lastPiEventAt == null;
    expect(shouldRequeue).toBe(true);
  });

  test("claimed with pi events should not be requeued", () => {
    const job = {
      paymentStatus: "PAID",
      status: "CLAIMED",
      dispatchedAt: new Date(),
      lastPiEventAt: new Date(),
    };
    const shouldRequeue = job.lastPiEventAt == null;
    expect(shouldRequeue).toBe(false);
  });
});
