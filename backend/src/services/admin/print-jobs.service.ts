import { and, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { db, pool } from "../../db";
import { kiosks, payments, printJobEvents, printJobs, refunds } from "../../db/schema";
import { NotFoundError } from "../../utils/errors";
import { serializePrintJob } from "../../utils/serializers";

export async function listAdminPrintJobs(options: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  kioskId?: string;
  from?: Date;
  to?: Date;
}) {
  const page = options.page ?? 1;
  const limit = Math.min(options.limit ?? 20, 100);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (options.status) conditions.push(eq(printJobs.status, options.status as "CREATED" | "PAYMENT_PENDING" | "PAID" | "QUEUED" | "CLAIMED" | "DOWNLOADING" | "PRINTING" | "COMPLETED" | "FAILED" | "CANCELLED" | "EXPIRED"));
  if (options.kioskId) conditions.push(eq(printJobs.kioskId, options.kioskId));
  if (options.from) conditions.push(gte(printJobs.createdAt, options.from));
  if (options.to) conditions.push(lte(printJobs.createdAt, options.to));

  if (options.search) {
    const q = `%${options.search}%`;
    const userResult = await pool.query(
      `SELECT id FROM "user" WHERE email ILIKE $1 OR name ILIKE $1 LIMIT 50`,
      [q]
    );
    const userIds = userResult.rows.map((r) => r.id as string);
    const searchConds = [ilike(printJobs.jobNumber, q), ilike(printJobs.originalFilename, q)];
    if (userIds.length > 0) {
      searchConds.push(or(...userIds.map((uid) => eq(printJobs.userId, uid)))!);
    }
    conditions.push(or(...searchConds)!);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(printJobs)
    .where(where)
    .orderBy(desc(printJobs.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const has_more = rows.length > limit;
  const sliced = has_more ? rows.slice(0, limit) : rows;

  const kioskRows = await db.select().from(kiosks);
  const kioskMap = new Map(kioskRows.map((k) => [k.id, k]));

  const userInfo = new Map<string, { email: string | null; image: string | null }>();
  for (const uid of [...new Set(sliced.map((j) => j.userId))]) {
    const res = await pool.query(`SELECT email, image FROM "user" WHERE id = $1`, [uid]);
    userInfo.set(uid, {
      email: (res.rows[0]?.email as string | null) ?? null,
      image: (res.rows[0]?.image as string | null) ?? null,
    });
  }

  const items = sliced.map((job) => ({
    ...serializePrintJob(job),
    kiosk_code: job.kioskId ? kioskMap.get(job.kioskId)?.kioskCode ?? null : null,
    user_email: userInfo.get(job.userId)?.email ?? null,
    user_image: userInfo.get(job.userId)?.image ?? null,
    completed_at: job.completedAt,
    failed_at: job.failedAt,
  }));

  return { items, page, limit, has_more };
}

export async function getAdminPrintJobById(id: string) {
  const [job] = await db.select().from(printJobs).where(eq(printJobs.id, id)).limit(1);
  if (!job) return null;

  const [payment] = await db.select().from(payments).where(eq(payments.printJobId, id)).limit(1);
  const [refund] = await db.select().from(refunds).where(eq(refunds.printJobId, id)).limit(1);
  const events = await db
    .select()
    .from(printJobEvents)
    .where(eq(printJobEvents.printJobId, id))
    .orderBy(printJobEvents.createdAt);

  let kiosk = null;
  if (job.kioskId) {
    const [k] = await db.select().from(kiosks).where(eq(kiosks.id, job.kioskId)).limit(1);
    kiosk = k ?? null;
  }

  const userRes = await pool.query(`SELECT id, email, name, image FROM "user" WHERE id = $1`, [job.userId]);
  const user = userRes.rows[0] ?? null;

  return {
    job: {
      ...serializePrintJob(job),
      failure_reason: job.failureReason,
      printer_job_id: job.printerJobId,
      completed_at: job.completedAt,
      failed_at: job.failedAt,
      printing_started_at: job.printingStartedAt,
      paid_at: job.paidAt,
      claimed_at: job.claimedAt,
      dispatched_at: job.dispatchedAt,
    },
    user: user
      ? { id: user.id, email: user.email, name: user.name, image: user.image ?? null }
      : { id: job.userId, email: null, name: null, image: null },
    kiosk: kiosk
      ? { id: kiosk.id, kiosk_code: kiosk.kioskCode, name: kiosk.name, location: kiosk.location }
      : null,
    payment: payment
      ? {
          id: payment.id,
          razorpay_order_id: payment.razorpayOrderId,
          razorpay_payment_id: payment.razorpayPaymentId,
          amount_paise: payment.amountPaise,
          currency: payment.currency,
          status: payment.status,
          created_at: payment.createdAt,
        }
      : null,
    refund: refund
      ? {
          id: refund.id,
          status: refund.status,
          amount_paise: refund.amountPaise,
          currency: refund.currency,
          razorpay_refund_id: refund.razorpayRefundId,
          failure_reason: refund.failureReason,
          created_at: refund.createdAt,
          processed_at: refund.processedAt,
        }
      : null,
    timeline: events.map((e) => ({
      id: e.id,
      event_type: e.eventType,
      message: e.message,
      metadata: e.metadata,
      created_at: e.createdAt,
    })),
  };
}
