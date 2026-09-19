import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import { kiosks, payments, printJobs, refunds } from "../../db/schema";
import { isKioskServiceOnline } from "../kiosk-status.service";
import { extractPrinterSummary } from "../kiosk-health.service";
import { istDayStart } from "../../utils/ist";
import { parsePageRange } from "../pricing.service";

export async function getAdminDashboard() {
  const todayStart = istDayStart();

  const [jobStats] = await db
    .select({
      total: count(),
      failed: sql<number>`count(*) filter (where ${printJobs.status} = 'FAILED')`,
      revenue: sql<number>`coalesce(sum(${printJobs.amountPaise}) filter (where ${printJobs.status} = 'COMPLETED'), 0)`,
    })
    .from(printJobs)
    .where(gte(printJobs.createdAt, todayStart));

  const completedToday = await db
    .select({
      pageCount: printJobs.pageCount,
      copies: printJobs.copies,
      pageRange: printJobs.pageRange,
      colorMode: printJobs.colorMode,
    })
    .from(printJobs)
    .where(and(eq(printJobs.status, "COMPLETED"), gte(printJobs.completedAt, todayStart)));

  let totalPages = 0;
  let bwPages = 0;
  let colorPages = 0;
  for (const row of completedToday) {
    try {
      const pages = parsePageRange(row.pageRange, row.pageCount).length * row.copies;
      totalPages += pages;
      if (row.colorMode === "BW") bwPages += pages;
      else colorPages += pages;
    } catch {
      /* skip invalid */
    }
  }

  const allKiosks = await db.select().from(kiosks);
  const activeKiosks = allKiosks.filter((k) => k.status === "ACTIVE");
  const onlineKiosks = activeKiosks.filter((k) => isKioskServiceOnline(k));

  const kioskStatus = await Promise.all(
    allKiosks.map(async (kiosk) => {
      const [jobsToday] = await db
        .select({ count: count() })
        .from(printJobs)
        .where(and(eq(printJobs.kioskId, kiosk.id), gte(printJobs.createdAt, todayStart)));

      const printer = extractPrinterSummary(kiosk.agentHealth as Record<string, unknown> | null);
      return {
        id: kiosk.id,
        kiosk_code: kiosk.kioskCode,
        display_name: kiosk.name,
        location: kiosk.location,
        status: kiosk.status,
        online: isKioskServiceOnline(kiosk),
        last_seen: kiosk.lastSeenAt,
        jobs_today: jobsToday?.count ?? 0,
        printer_status: printer.status,
        printer_name: printer.name,
      };
    })
  );

  const recentJobs = await db
    .select({
      id: printJobs.id,
      jobNumber: printJobs.jobNumber,
      userId: printJobs.userId,
      kioskId: printJobs.kioskId,
      pageCount: printJobs.pageCount,
      copies: printJobs.copies,
      amountPaise: printJobs.amountPaise,
      status: printJobs.status,
      createdAt: printJobs.createdAt,
      originalFilename: printJobs.originalFilename,
    })
    .from(printJobs)
    .orderBy(desc(printJobs.createdAt))
    .limit(10);

  const kioskMap = new Map(allKiosks.map((k) => [k.id, k]));

  const [failedRefunds] = await db
    .select({ count: count() })
    .from(refunds)
    .where(eq(refunds.status, "FAILED"));

  const needsAttention: Array<{
    type: string;
    message: string;
    resource_id: string;
    href: string;
  }> = [];

  for (const k of kioskStatus) {
    if (k.status === "ACTIVE" && !k.online) {
      needsAttention.push({
        type: "offline_kiosk",
        message: `${k.kiosk_code} is offline`,
        resource_id: k.id,
        href: `/kiosks/${k.id}`,
      });
    }
    if (k.printer_status === "error") {
      needsAttention.push({
        type: "printer_error",
        message: `Printer error on ${k.kiosk_code}`,
        resource_id: k.id,
        href: `/kiosks/${k.id}`,
      });
    }
  }

  const failedJobsToday = await db
    .select({ id: printJobs.id, jobNumber: printJobs.jobNumber })
    .from(printJobs)
    .where(and(eq(printJobs.status, "FAILED"), gte(printJobs.createdAt, todayStart)))
    .limit(5);

  for (const job of failedJobsToday) {
    needsAttention.push({
      type: "failed_job",
      message: `Failed job ${job.jobNumber}`,
      resource_id: job.id,
      href: `/print-jobs/${job.id}`,
    });
  }

  if ((failedRefunds?.count ?? 0) > 0) {
    needsAttention.push({
      type: "failed_refunds",
      message: `${failedRefunds?.count} failed refund(s)`,
      resource_id: "refunds",
      href: "/refunds?status=FAILED",
    });
  }

  return {
    overview: {
      jobs_today: jobStats?.total ?? 0,
      revenue_today_paise: Number(jobStats?.revenue ?? 0),
      active_kiosks: onlineKiosks.length,
      failed_jobs_today: Number(jobStats?.failed ?? 0),
      total_pages_today: totalPages,
      bw_pages_today: bwPages,
      color_pages_today: colorPages,
    },
    kiosks: kioskStatus,
    recent_jobs: recentJobs.map((j) => ({
      id: j.id,
      job_number: j.jobNumber,
      user_id: j.userId,
      kiosk_code: j.kioskId ? kioskMap.get(j.kioskId)?.kioskCode ?? null : null,
      kiosk_id: j.kioskId,
      pages: j.pageCount * j.copies,
      amount_paise: j.amountPaise,
      status: j.status,
      filename: j.originalFilename,
      created_at: j.createdAt,
    })),
    needs_attention: needsAttention,
  };
}
