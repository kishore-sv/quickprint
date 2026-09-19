import { and, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { db } from "../../db";
import { payments, printJobs, refunds } from "../../db/schema";
import { NotFoundError } from "../../utils/errors";

export async function listAdminRefunds(options: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  from?: Date;
  to?: Date;
}) {
  const page = options.page ?? 1;
  const limit = Math.min(options.limit ?? 20, 100);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (options.status) conditions.push(eq(refunds.status, options.status as "PROCESSING" | "REFUNDED" | "FAILED"));
  if (options.from) conditions.push(gte(refunds.createdAt, options.from));
  if (options.to) conditions.push(lte(refunds.createdAt, options.to));
  if (options.search) {
    const q = `%${options.search}%`;
    conditions.push(
      or(
        ilike(refunds.razorpayRefundId, q),
        ilike(refunds.razorpayPaymentId, q)
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      refund: refunds,
      job: printJobs,
      payment: payments,
    })
    .from(refunds)
    .innerJoin(printJobs, eq(refunds.printJobId, printJobs.id))
    .innerJoin(payments, eq(refunds.paymentId, payments.id))
    .where(where)
    .orderBy(desc(refunds.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const has_more = rows.length > limit;
  const sliced = has_more ? rows.slice(0, limit) : rows;

  const items = sliced.map(({ refund, job, payment }) => ({
    id: refund.id,
    print_job_id: refund.printJobId,
    payment_id: refund.paymentId,
    job_number: job.jobNumber,
    amount_paise: refund.amountPaise,
    currency: refund.currency,
    status: refund.status,
    razorpay_refund_id: refund.razorpayRefundId,
    razorpay_payment_id: refund.razorpayPaymentId,
    failure_reason: refund.failureReason,
    created_at: refund.createdAt,
    processed_at: refund.processedAt,
  }));

  return { items, page, limit, has_more };
}

export async function getAdminRefundById(id: string) {
  const [row] = await db
    .select({ refund: refunds, job: printJobs, payment: payments })
    .from(refunds)
    .innerJoin(printJobs, eq(refunds.printJobId, printJobs.id))
    .innerJoin(payments, eq(refunds.paymentId, payments.id))
    .where(eq(refunds.id, id))
    .limit(1);
  if (!row) throw new NotFoundError("Refund not found");

  return {
    id: row.refund.id,
    print_job_id: row.refund.printJobId,
    payment_id: row.refund.paymentId,
    job_number: row.job.jobNumber,
    amount_paise: row.refund.amountPaise,
    currency: row.refund.currency,
    status: row.refund.status,
    razorpay_refund_id: row.refund.razorpayRefundId,
    razorpay_payment_id: row.refund.razorpayPaymentId,
    failure_reason: row.refund.failureReason,
    created_at: row.refund.createdAt,
    processed_at: row.refund.processedAt,
    payment: {
      id: row.payment.id,
      razorpay_order_id: row.payment.razorpayOrderId,
      amount_paise: row.payment.amountPaise,
      status: row.payment.status,
    },
  };
}
