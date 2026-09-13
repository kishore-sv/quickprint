import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import Razorpay from "razorpay";
import { and, desc, eq } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../db";
import { payments, printJobEvents, printJobs } from "../db/schema";
import { PrintJobEventType } from "../types/enums";
import { NotFoundError, PaymentError } from "../utils/errors";
import { bindJobToUserKiosk } from "./kiosk-bind.service";
import { enqueueDispatchForKiosk } from "./kiosk-dispatch.service";

export function getRazorpayClient() {
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(body).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function verifyWebhookSignature(body: Buffer, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    if (env.NODE_ENV === "production") {
      throw new PaymentError("Webhook secret not configured", "WEBHOOK_MISCONFIGURED");
    }
    return false;
  }
  const expected = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function markPaymentSuccessByOrderId(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  idempotencyKey?: string
) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.razorpayOrderId, razorpayOrderId))
    .limit(1);
  if (!payment) throw new NotFoundError("Payment not found");
  return markPaymentSuccess(payment.id, razorpayPaymentId, idempotencyKey);
}

export async function markPaymentSuccess(
  paymentRowId: string,
  razorpayPaymentId: string,
  idempotencyKey?: string
) {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentRowId))
      .limit(1);
    if (!payment) throw new NotFoundError("Payment not found");

    const [existingJob] = await tx
      .select()
      .from(printJobs)
      .where(eq(printJobs.id, payment.printJobId))
      .limit(1);
    if (!existingJob) throw new NotFoundError("Print job not found");

    if (payment.status === "SUCCESS") {
      return existingJob;
    }

    await tx
      .update(payments)
      .set({
        status: "SUCCESS",
        razorpayPaymentId,
        idempotencyKey: idempotencyKey ?? payment.idempotencyKey,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    const now = new Date();
    const [job] = await tx
      .update(printJobs)
      .set({
        paymentStatus: "PAID",
        status: "QUEUED",
        paidAt: now,
      })
      .where(eq(printJobs.id, payment.printJobId))
      .returning();

    await tx.insert(printJobEvents).values({
      id: randomUUID(),
      printJobId: payment.printJobId,
      eventType: PrintJobEventType.PAYMENT_SUCCESS,
      metadata: { payment_id: razorpayPaymentId },
    });
    await tx.insert(printJobEvents).values({
      id: randomUUID(),
      printJobId: payment.printJobId,
      eventType: PrintJobEventType.QUEUED,
      metadata: null,
    });

    return job!;
  }).then(async (job) => {
    try {
      const bound = await bindJobToUserKiosk(job.id, job.userId);
      if (bound.kioskId) {
        void enqueueDispatchForKiosk(bound.kioskId);
      }
    } catch {
      /* no kiosk session — legacy manual release flow */
    }
    return job;
  });
}

export async function findOpenPaymentForJob(printJobId: string) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.printJobId, printJobId), eq(payments.status, "CREATED")))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return payment ?? null;
}
