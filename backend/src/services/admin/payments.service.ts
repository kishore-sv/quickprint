import { and, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { db, pool } from "../../db";
import { payments, printJobs } from "../../db/schema";
import { NotFoundError } from "../../utils/errors";

export async function listAdminPayments(options: {
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
  if (options.status) conditions.push(eq(payments.status, options.status as "CREATED" | "SUCCESS" | "FAILED"));
  if (options.from) conditions.push(gte(payments.createdAt, options.from));
  if (options.to) conditions.push(lte(payments.createdAt, options.to));
  if (options.search) {
    const q = `%${options.search}%`;
    conditions.push(
      or(
        ilike(payments.razorpayOrderId, q),
        ilike(payments.razorpayPaymentId, q)
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      payment: payments,
      job: printJobs,
    })
    .from(payments)
    .innerJoin(printJobs, eq(payments.printJobId, printJobs.id))
    .where(where)
    .orderBy(desc(payments.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const has_more = rows.length > limit;
  const sliced = has_more ? rows.slice(0, limit) : rows;

  const items = await Promise.all(
    sliced.map(async ({ payment, job }) => {
      const userRes = await pool.query(`SELECT email, image FROM "user" WHERE id = $1`, [job.userId]);
      return {
        id: payment.id,
        print_job_id: payment.printJobId,
        job_number: job.jobNumber,
        user_id: job.userId,
        user_email: userRes.rows[0]?.email ?? null,
        user_image: userRes.rows[0]?.image ?? null,
        amount_paise: payment.amountPaise,
        currency: payment.currency,
        razorpay_order_id: payment.razorpayOrderId,
        razorpay_payment_id: payment.razorpayPaymentId,
        status: payment.status,
        created_at: payment.createdAt,
      };
    })
  );

  return { items, page, limit, has_more };
}

export async function getAdminPaymentById(id: string) {
  const [row] = await db
    .select({ payment: payments, job: printJobs })
    .from(payments)
    .innerJoin(printJobs, eq(payments.printJobId, printJobs.id))
    .where(eq(payments.id, id))
    .limit(1);
  if (!row) throw new NotFoundError("Payment not found");

  const userRes = await pool.query(`SELECT email, name, image FROM "user" WHERE id = $1`, [
    row.job.userId,
  ]);

  return {
    id: row.payment.id,
    print_job_id: row.payment.printJobId,
    job_number: row.job.jobNumber,
    user_id: row.job.userId,
    user_email: userRes.rows[0]?.email ?? null,
    user_image: userRes.rows[0]?.image ?? null,
    amount_paise: row.payment.amountPaise,
    currency: row.payment.currency,
    razorpay_order_id: row.payment.razorpayOrderId,
    razorpay_payment_id: row.payment.razorpayPaymentId,
    status: row.payment.status,
    created_at: row.payment.createdAt,
    updated_at: row.payment.updatedAt,
  };
}
