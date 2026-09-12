import { describe, expect, test } from "bun:test";
import { createHmac } from "crypto";

describe("payments", () => {
  test("razorpay checkout signature format", () => {
    const secret = "test_secret";
    const orderId = "order_123";
    const paymentId = "pay_456";
    const body = `${orderId}|${paymentId}`;
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    expect(signature).toBe(expected);
  });

  test("verifyPaymentSignature with env secret", async () => {
    const { verifyPaymentSignature } = await import("../src/services/payment.service");
    const orderId = "order_abc";
    const paymentId = "pay_xyz";
    const sig = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    expect(verifyPaymentSignature(orderId, paymentId, sig)).toBe(true);
  });
});
