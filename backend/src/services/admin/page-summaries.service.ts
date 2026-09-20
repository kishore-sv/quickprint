import { and, count, isNotNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { payments, printJobs, refunds } from "../../db/schema";
import { daysAgoIst, istDayStart } from "../../utils/ist";
import { getOrSetSummary } from "../../utils/summary-cache";

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function formatTrend(current: number, previous: number, label: string): string | null {
  const change = pctChange(current, previous);
  if (change === null) return null;
  if (change === 0) return `Same as ${label}`;
  if (change > 0) return `${change}% more than ${label}`;
  return `${Math.abs(change)}% less than ${label}`;
}

export async function getUsersPageSummary() {
  return getOrSetSummary("summary:users", async () => {
    const [row] = await db
      .select({
        total_jobs: count(),
        total_spent_paise: sql<number>`coalesce(sum(${printJobs.amountPaise}) filter (where ${printJobs.status} = 'COMPLETED'), 0)`,
      })
      .from(printJobs);

    return {
      total_jobs: row?.total_jobs ?? 0,
      total_spent_paise: Number(row?.total_spent_paise ?? 0),
    };
  });
}

export async function getPrintJobsPageSummary() {
  return getOrSetSummary("summary:print-jobs", async () => {
    const [row] = await db
      .select({
        total_jobs: count(),
        total_pages: sql<number>`coalesce(sum(${printJobs.pageCount} * ${printJobs.copies}), 0)`,
        total_copies: sql<number>`coalesce(sum(${printJobs.copies}), 0)`,
        total_amount_paise: sql<number>`coalesce(sum(${printJobs.amountPaise}) filter (where ${printJobs.status} = 'COMPLETED'), 0)`,
      })
      .from(printJobs);

    return {
      total_jobs: row?.total_jobs ?? 0,
      total_pages: Number(row?.total_pages ?? 0),
      total_copies: Number(row?.total_copies ?? 0),
      total_amount_paise: Number(row?.total_amount_paise ?? 0),
    };
  });
}

export async function getKiosksPageSummary() {
  return getOrSetSummary("summary:kiosks", async () => {
    const [row] = await db
      .select({
        total_jobs: sql<number>`count(*) filter (where ${printJobs.kioskId} is not null)`,
        total_revenue_paise: sql<number>`coalesce(sum(${printJobs.amountPaise}) filter (where ${printJobs.status} = 'COMPLETED' and ${printJobs.kioskId} is not null), 0)`,
      })
      .from(printJobs);

    return {
      total_jobs: Number(row?.total_jobs ?? 0),
      total_revenue_paise: Number(row?.total_revenue_paise ?? 0),
    };
  });
}

export async function getPrintersPageSummary() {
  return getOrSetSummary("summary:printers", async () => {
    const [row] = await db
      .select({
        total_jobs: count(),
        total_pages: sql<number>`coalesce(sum(${printJobs.pageCount} * ${printJobs.copies}), 0)`,
      })
      .from(printJobs)
      .where(
        and(isNotNull(printJobs.kioskId), sql`${printJobs.status} = 'COMPLETED'`)
      );

    return {
      total_jobs: row?.total_jobs ?? 0,
      total_pages: Number(row?.total_pages ?? 0),
    };
  });
}

export async function getPaymentsPageSummary() {
  return getOrSetSummary("summary:payments", async () => {
    const todayStart = istDayStart();
    const yesterdayStart = daysAgoIst(1);
    const weekStart = daysAgoIst(6);
    const prevWeekStart = daysAgoIst(13);

    const [row] = await db
      .select({
        total_amount_paise: sql<number>`coalesce(sum(${payments.amountPaise}) filter (where ${payments.status} = 'SUCCESS'), 0)`,
        today_amount_paise: sql<number>`coalesce(sum(${payments.amountPaise}) filter (where ${payments.status} = 'SUCCESS' and ${payments.createdAt} >= ${todayStart}), 0)`,
        yesterday_amount_paise: sql<number>`coalesce(sum(${payments.amountPaise}) filter (where ${payments.status} = 'SUCCESS' and ${payments.createdAt} >= ${yesterdayStart} and ${payments.createdAt} < ${todayStart}), 0)`,
        week_amount_paise: sql<number>`coalesce(sum(${payments.amountPaise}) filter (where ${payments.status} = 'SUCCESS' and ${payments.createdAt} >= ${weekStart}), 0)`,
        prev_week_amount_paise: sql<number>`coalesce(sum(${payments.amountPaise}) filter (where ${payments.status} = 'SUCCESS' and ${payments.createdAt} >= ${prevWeekStart} and ${payments.createdAt} < ${weekStart}), 0)`,
        week_payment_count: sql<number>`count(*) filter (where ${payments.status} = 'SUCCESS' and ${payments.createdAt} >= ${weekStart})`,
      })
      .from(payments);

    const todayAmount = Number(row?.today_amount_paise ?? 0);
    const yesterdayAmount = Number(row?.yesterday_amount_paise ?? 0);
    const weekAmount = Number(row?.week_amount_paise ?? 0);
    const prevWeekAmount = Number(row?.prev_week_amount_paise ?? 0);

    return {
      total_amount_paise: Number(row?.total_amount_paise ?? 0),
      today_amount_paise: todayAmount,
      week_amount_paise: weekAmount,
      week_payment_count: Number(row?.week_payment_count ?? 0),
      today_trend: formatTrend(todayAmount, yesterdayAmount, "yesterday"),
      week_trend: formatTrend(weekAmount, prevWeekAmount, "last week"),
    };
  });
}

export async function getRefundsPageSummary() {
  return getOrSetSummary("summary:refunds", async () => {
    const [row] = await db
      .select({
        total_amount_paise: sql<number>`coalesce(sum(${refunds.amountPaise}) filter (where ${refunds.status} = 'REFUNDED'), 0)`,
        total_prints: sql<number>`count(*) filter (where ${refunds.status} = 'REFUNDED')`,
      })
      .from(refunds);

    return {
      total_amount_paise: Number(row?.total_amount_paise ?? 0),
      total_prints: Number(row?.total_prints ?? 0),
    };
  });
}

const SUMMARY_HANDLERS: Record<string, () => Promise<unknown>> = {
  users: getUsersPageSummary,
  "print-jobs": getPrintJobsPageSummary,
  kiosks: getKiosksPageSummary,
  printers: getPrintersPageSummary,
  payments: getPaymentsPageSummary,
  refunds: getRefundsPageSummary,
};

export async function getPageSummary(page: string) {
  const handler = SUMMARY_HANDLERS[page];
  if (!handler) return null;
  return handler();
}
