import { count, desc, eq, sql } from "drizzle-orm";
import { db, pool } from "../../db";
import { payments, printJobs, profiles, refunds } from "../../db/schema";
import { NotFoundError } from "../../utils/errors";

export async function listAdminUsers(options: { page?: number; limit?: number; search?: string }) {
  const page = options.page ?? 1;
  const limit = Math.min(options.limit ?? 20, 100);
  const offset = (page - 1) * limit;

  const searchClause = options.search
    ? `WHERE u.email ILIKE $3 OR u.name ILIKE $3`
    : "";
  const searchVal = options.search ? `%${options.search}%` : null;

  const countQuery = await pool.query(
    `SELECT count(*)::int AS total FROM "user" u ${searchClause}`,
    searchVal ? [searchVal] : []
  );
  const total = countQuery.rows[0]?.total ?? 0;

  const result = await pool.query(
    `SELECT u.id, u.email, u.name, u."createdAt" as created_at, u.role,
            p.display_name
     FROM "user" u
     LEFT JOIN profiles p ON p.id = u.id
     ${searchClause}
     ORDER BY u."createdAt" DESC
     LIMIT $1 OFFSET $2`,
    searchVal ? [limit, offset, searchVal] : [limit, offset]
  );

  const items = await Promise.all(
    result.rows.map(async (row) => {
      const userId = row.id as string;
      const [jobStats] = await db
        .select({
          total_jobs: count(),
          total_spent: sql<number>`coalesce(sum(${printJobs.amountPaise}) filter (where ${printJobs.status} = 'COMPLETED'), 0)`,
        })
        .from(printJobs)
        .where(eq(printJobs.userId, userId));

      return {
        id: userId,
        name: row.name ?? row.display_name ?? null,
        email: row.email,
        role: row.role ?? "user",
        total_jobs: jobStats?.total_jobs ?? 0,
        total_spent_paise: Number(jobStats?.total_spent ?? 0),
        created_at: row.created_at,
        status: row.role === "admin" ? "admin" : "active",
      };
    })
  );

  return {
    items,
    page,
    limit,
    has_more: offset + items.length < total,
    total,
  };
}

export async function getAdminUserById(id: string) {
  const userRes = await pool.query(
    `SELECT u.id, u.email, u.name, u."createdAt" as created_at, u.role,
            p.display_name
     FROM "user" u
     LEFT JOIN profiles p ON p.id = u.id
     WHERE u.id = $1`,
    [id]
  );
  if (userRes.rows.length === 0) throw new NotFoundError("User not found");
  const row = userRes.rows[0];

  const jobs = await db
    .select()
    .from(printJobs)
    .where(eq(printJobs.userId, id))
    .orderBy(desc(printJobs.createdAt))
    .limit(20);

  const userPayments = await db
    .select({ payment: payments, job: printJobs })
    .from(payments)
    .innerJoin(printJobs, eq(payments.printJobId, printJobs.id))
    .where(eq(printJobs.userId, id))
    .orderBy(desc(payments.createdAt))
    .limit(20);

  const userRefunds = await db
    .select({ refund: refunds, job: printJobs })
    .from(refunds)
    .innerJoin(printJobs, eq(refunds.printJobId, printJobs.id))
    .where(eq(printJobs.userId, id))
    .orderBy(desc(refunds.createdAt))
    .limit(20);

  const [jobStats] = await db
    .select({
      total_jobs: count(),
      total_spent: sql<number>`coalesce(sum(${printJobs.amountPaise}) filter (where ${printJobs.status} = 'COMPLETED'), 0)`,
    })
    .from(printJobs)
    .where(eq(printJobs.userId, id));

  return {
    profile: {
      id: row.id,
      name: row.name ?? row.display_name ?? null,
      email: row.email,
      role: row.role ?? "user",
      created_at: row.created_at,
      total_jobs: jobStats?.total_jobs ?? 0,
      total_spent_paise: Number(jobStats?.total_spent ?? 0),
    },
    print_jobs: jobs.map((j) => ({
      id: j.id,
      job_number: j.jobNumber,
      status: j.status,
      amount_paise: j.amountPaise,
      created_at: j.createdAt,
    })),
    payments: userPayments.map(({ payment, job }) => ({
      id: payment.id,
      job_number: job.jobNumber,
      amount_paise: payment.amountPaise,
      status: payment.status,
      created_at: payment.createdAt,
    })),
    refunds: userRefunds.map(({ refund, job }) => ({
      id: refund.id,
      job_number: job.jobNumber,
      amount_paise: refund.amountPaise,
      status: refund.status,
      created_at: refund.createdAt,
    })),
  };
}
