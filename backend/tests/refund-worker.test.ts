import { describe, expect, test } from "bun:test";
import { isPermanentRefundError } from "../src/services/refund.service";

describe("refund service helpers", () => {
  test("detects permanent Razorpay refund errors", () => {
    expect(
      isPermanentRefundError({
        error: { code: "BAD_REQUEST_ERROR", description: "The payment has already been refunded" },
      })
    ).toBe(true);
  });

  test("treats unknown errors as transient", () => {
    expect(isPermanentRefundError(new Error("network timeout"))).toBe(false);
  });
});
