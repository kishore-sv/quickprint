import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { payments, printJobs, refunds } from "../db/schema";
import type { RefundStatus } from "../types/enums";
import { NotFoundError, PaymentError } from "../utils/errors";
import { logger } from "../utils/logger";
import { refundRazorpayPayment } from "./payment.service";
import { deleteCancelledJobFile } from "./cancellation-cleanup.service";

type RazorpayErrorShape = {
  statusCode?: number;
  error?: {
    code?: string;
    description?: string;
    reason?: string;
  };
};

export function isPermanentRefundError(err: unknown): boolean {
  const e = err as RazorpayErrorShape;
  const code = e.error?.code?.toUpperCase() ?? "";
  const description = (e.error?.description ?? "").toLowerCase();
  if (code.includes("BAD_REQUEST")) return true;
  if (description.includes("already been refunded")) return true;
  if (description.includes("invalid")) return true;
  if (description.includes("not captured")) return true;
  return false;
}

export async function getRefundById(refundId: string) {
  const [row] = await db.select().from(refunds).where(eq(refunds.id, refundId)).limit(1);
  return row ?? null;
}

export async function getRefundForJob(printJobId: string) {
  const [row] = await db.select().from(refunds).where(eq(refunds.printJobId, printJobId)).limit(1);
  return row ?? null;
}

export async function processRefund(refundId: string): Promise<void> {
  const refund = await getRefundById(refundId);
  if (!refund) {
    logger.warn({ refundId }, "refund processing skipped missing record");
    return;
  }

  if (refund.status === "REFUNDED") {
    logger.info({ refundId, printJobId: refund.printJobId }, "refund already completed");
    await deleteCancelledJobFile(refund.printJobId);
    return;
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, refund.paymentId))
    .limit(1);
  if (!payment) throw new NotFoundError("Payment not found for refund");

  const [job] = await db
    .select()
    .from(printJobs)
    .where(eq(printJobs.id, refund.printJobId))
    .limit(1);
  if (!job) throw new NotFoundError("Print job not found for refund");

  if (!payment.razorpayPaymentId) {
    await markRefundFailed(refund.id, "Payment has no Razorpay payment id");
    return;
  }

  const now = new Date();
  await db
    .update(refunds)
    .set({ status: "PROCESSING", updatedAt: now })
    .where(eq(refunds.id, refund.id));

  logger.info(
    { refundId: refund.id, printJobId: refund.printJobId, paymentId: payment.id },
    "refund processing"
  );

  if (refund.razorpayRefundId) {
    await markRefundRefunded(refund.id, refund.razorpayRefundId);
    await deleteCancelledJobFile(refund.printJobId);
    return;
  }

  try {
    const idempotencyKey = `refund-${refund.id}`;
    const result = await refundRazorpayPayment(
      payment.razorpayPaymentId,
      refund.amountPaise,
      idempotencyKey
    );
    const razorpayRefundId =
      typeof result === "object" && result && "id" in result
        ? String((result as { id: string }).id)
        : null;
    if (!razorpayRefundId) {
      throw new PaymentError("Razorpay refund response missing id");
    }
    await markRefundRefunded(refund.id, razorpayRefundId);
    logger.info(
      {
        refundId: refund.id,
        printJobId: refund.printJobId,
        razorpayRefundId,
      },
      "refund succeeded"
    );
  } catch (err) {
    if (isPermanentRefundError(err)) {
      const message =
        (err as RazorpayErrorShape).error?.description ??
        (err instanceof Error ? err.message : "Refund failed");
      await markRefundFailed(refund.id, message);
      logger.warn({ refundId: refund.id, printJobId: refund.printJobId, err: message }, "refund failed permanent");
      await deleteCancelledJobFile(refund.printJobId);
      return;
    }
    logger.warn({ refundId: refund.id, err }, "refund failed transient");
    throw err;
  }

  await deleteCancelledJobFile(refund.printJobId);
}

async function markRefundRefunded(refundId: string, razorpayRefundId: string) {
  const now = new Date();
  const [updated] = await db
    .update(refunds)
    .set({
      status: "REFUNDED",
      razorpayRefundId,
      processedAt: now,
      updatedAt: now,
    })
    .where(eq(refunds.id, refundId))
    .returning();

  if (!updated) return;

  await db
    .update(printJobs)
    .set({ paymentStatus: "REFUNDED" })
    .where(eq(printJobs.id, updated.printJobId));
}

async function markRefundFailed(refundId: string, reason: string) {
  const now = new Date();
  await db
    .update(refunds)
    .set({
      status: "FAILED",
      failureReason: reason.slice(0, 512),
      processedAt: now,
      updatedAt: now,
    })
    .where(and(eq(refunds.id, refundId), eq(refunds.status, "PROCESSING")));
}

export async function createRefundRecord(
  tx: Pick<typeof db, "insert" | "select">,
  params: {
    printJobId: string;
    paymentId: string;
    razorpayPaymentId: string;
    amountPaise: number;
    currency: string;
  }
) {
  const [created] = await tx
    .insert(refunds)
    .values({
      id: randomUUID(),
      printJobId: params.printJobId,
      paymentId: params.paymentId,
      razorpayPaymentId: params.razorpayPaymentId,
      amountPaise: params.amountPaise,
      currency: params.currency,
      status: "PROCESSING" as RefundStatus,
    })
    .onConflictDoNothing({ target: refunds.printJobId })
    .returning();

  if (created) return { refund: created, createdNew: true };

  const [existing] = await tx
    .select()
    .from(refunds)
    .where(eq(refunds.printJobId, params.printJobId))
    .limit(1);
  return { refund: existing!, createdNew: false };
}
