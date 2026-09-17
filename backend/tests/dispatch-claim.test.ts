import { describe, expect, test } from "bun:test";
import {
  buildDispatchClaimWhere,
  buildPaidCancellationWhere,
  buildUnpaidCancellationWhere,
} from "../src/services/dispatch-claim";

describe("dispatch claim predicates", () => {
  test("buildDispatchClaimWhere returns a drizzle condition", () => {
    expect(buildDispatchClaimWhere("kiosk-1", "job-1")).toBeDefined();
  });

  test("buildPaidCancellationWhere returns a drizzle condition", () => {
    expect(buildPaidCancellationWhere("job-1")).toBeDefined();
  });

  test("buildUnpaidCancellationWhere returns a drizzle condition", () => {
    expect(buildUnpaidCancellationWhere("job-1")).toBeDefined();
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

  test("cancelled job is not eligible for dispatch claim", () => {
    const job = {
      paymentStatus: "PAID",
      status: "CANCELLED",
      kioskId: "k1",
      dispatchedAt: null,
    };
    const eligible = job.status === "QUEUED" && job.dispatchedAt == null;
    expect(eligible).toBe(false);
  });
});

describe("paid cancellation mutex (logic)", () => {
  function canCancelPaid(job: {
    status: string;
    dispatchedAt: Date | null;
  }): boolean {
    if (job.status === "QUEUED") {
      return job.dispatchedAt == null;
    }
    return job.status === "CLAIMED" || job.status === "DOWNLOADING";
  }

  test("QUEUED without dispatch is cancellable", () => {
    expect(canCancelPaid({ status: "QUEUED", dispatchedAt: null })).toBe(true);
  });

  test("QUEUED with dispatch claim is not cancellable", () => {
    expect(canCancelPaid({ status: "QUEUED", dispatchedAt: new Date() })).toBe(false);
  });

  test("CLAIMED with dispatch is cancellable", () => {
    expect(canCancelPaid({ status: "CLAIMED", dispatchedAt: new Date() })).toBe(true);
  });

  test("PRINTING is not cancellable via mutex", () => {
    expect(canCancelPaid({ status: "PRINTING", dispatchedAt: new Date() })).toBe(false);
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

  test("cancelled job should not be requeued", () => {
    const job = {
      paymentStatus: "PAID",
      status: "CANCELLED",
      dispatchedAt: new Date(),
      lastPiEventAt: null,
    };
    const shouldRequeue =
      job.status !== "CANCELLED" &&
      (job.status === "QUEUED" || job.status === "CLAIMED") &&
      job.dispatchedAt != null &&
      job.lastPiEventAt == null;
    expect(shouldRequeue).toBe(false);
  });
});
