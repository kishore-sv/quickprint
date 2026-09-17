import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { payments, printJobEvents, printJobs, refunds } from "../db/schema";
import type { InferSelectModel } from "drizzle-orm";
import { PrintJobEventType } from "../types/enums";
import { ConflictError, NotFoundError, PaymentError } from "../utils/errors";
import { logger } from "../utils/logger";
import { enqueueRefundJob } from "../queues/refund.queue";
import { isJobCancellable } from "./cancellability";
import { createRefundRecord } from "./refund.service";
import {
  buildPaidCancellationWhere,
  buildUnpaidCancellationWhere,
} from "./dispatch-claim";
import { cancelJobOnKiosk } from "./kiosk-dispatch.service";

export type CancelPrintJobResult = {
  job: InferSelectModel<typeof printJobs>;
  refund: InferSelectModel<typeof refunds> | null;
  enqueueRefund: boolean;
  notifyPi: boolean;
};

function jobCancellabilityInput(job: InferSelectModel<typeof printJobs>) {
  return {
    status: job.status,
    paymentStatus: job.paymentStatus,
    piPhase: job.piPhase,
    dispatchedAt: job.dispatchedAt,
    userErrorCode: job.userErrorCode,
    paidAt: job.paidAt,
    completedAt: job.completedAt,
    failedAt: job.failedAt,
    lastPiEventAt: job.lastPiEventAt,
    createdAt: job.createdAt,
  };
}

export async function cancelPrintJob(userId: string, jobId: string): Promise<CancelPrintJobResult> {
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM print_jobs WHERE id = ${jobId} AND user_id = ${userId} FOR UPDATE`
    );

    const [job] = await tx
      .select()
      .from(printJobs)
      .where(and(eq(printJobs.id, jobId), eq(printJobs.userId, userId)))
      .limit(1);
    if (!job) throw new NotFoundError("Job not found");

    const check = isJobCancellable(jobCancellabilityInput(job));
    if (check.alreadyCancelled) {
      const [existingRefund] = await tx
        .select()
        .from(refunds)
        .where(eq(refunds.printJobId, job.id))
        .limit(1);
      return {
        job,
        refund: existingRefund ?? null,
        enqueueRefund: false,
        notifyPi: false,
      };
    }

    if (!check.cancellable) {
      throw new ConflictError(
        check.paid && (job.status === "PRINTING" || job.piPhase === "PRINTING" || job.piPhase === "SUBMITTED")
          ? "Job cannot be cancelled because printing has already started"
          : "Job cannot be cancelled"
      );
    }

    const cancellationWhere = check.paid
      ? buildPaidCancellationWhere(job.id)
      : buildUnpaidCancellationWhere(job.id);

    const [updated] = await tx
      .update(printJobs)
      .set({ status: "CANCELLED" })
      .where(cancellationWhere)
      .returning();

    if (!updated) {
      const [fresh] = await tx.select().from(printJobs).where(eq(printJobs.id, job.id)).limit(1);
      if (fresh?.status === "CANCELLED") {
        const [existingRefund] = await tx
          .select()
          .from(refunds)
          .where(eq(refunds.printJobId, job.id))
          .limit(1);
        return {
          job: fresh,
          refund: existingRefund ?? null,
          enqueueRefund: false,
          notifyPi: false,
        };
      }
      throw new ConflictError("Job cannot be cancelled");
    }

    await tx.insert(printJobEvents).values({
      id: randomUUID(),
      printJobId: job.id,
      eventType: PrintJobEventType.CANCELLED,
      metadata: null,
    });

    let refundRow: InferSelectModel<typeof refunds> | null = null;
    let enqueueRefund = false;

    if (check.paid) {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.printJobId, job.id), eq(payments.status, "SUCCESS")))
        .orderBy(sql`${payments.createdAt} DESC`)
        .limit(1);

      if (!payment?.razorpayPaymentId) {
        throw new PaymentError("No successful payment found for refund");
      }

      const { refund, createdNew } = await createRefundRecord(tx, {
        printJobId: job.id,
        paymentId: payment.id,
        razorpayPaymentId: payment.razorpayPaymentId,
        amountPaise: payment.amountPaise,
        currency: payment.currency,
      });
      refundRow = refund;
      enqueueRefund = createdNew;
    }

    const notifyPi = Boolean(updated.kioskId && updated.dispatchedAt);

    return {
      job: updated,
      refund: refundRow,
      enqueueRefund,
      notifyPi,
    };
  });

  if (result.enqueueRefund && result.refund) {
    await enqueueRefundJob(result.refund.id);
    logger.info(
      { refundId: result.refund.id, printJobId: result.job.id },
      "refund queued"
    );
  }

  if (result.notifyPi && result.job.kioskId) {
    cancelJobOnKiosk(result.job.kioskId, result.job.id);
  }

  return result;
}
