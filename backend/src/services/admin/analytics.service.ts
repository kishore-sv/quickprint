import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import { kiosks, printJobs } from "../../db/schema";
import { parsePageRange } from "../pricing.service";
import { istDayStart, daysAgoIst } from "../../utils/ist";

export type PrintUsageRange = "today" | "yesterday" | "7d" | "30d" | "custom";

export function resolveUsageDateRange(
  range: PrintUsageRange,
  from?: Date,
  to?: Date
): { from: Date; to: Date } {
  const now = new Date();
  if (range === "today") {
    return { from: istDayStart(now), to: now };
  }
  if (range === "yesterday") {
    const yStart = daysAgoIst(1);
    const yEnd = new Date(istDayStart(now).getTime() - 1);
    return { from: yStart, to: yEnd };
  }
  if (range === "7d") {
    return { from: daysAgoIst(6), to: now };
  }
  if (range === "30d") {
    return { from: daysAgoIst(29), to: now };
  }
  return {
    from: from ?? daysAgoIst(6),
    to: to ?? now,
  };
}

function jobPages(row: typeof printJobs.$inferSelect): number {
  try {
    return parsePageRange(row.pageRange, row.pageCount).length * row.copies;
  } catch {
    return row.pageCount * row.copies;
  }
}

export async function getPrintUsageAnalytics(params: {
  range?: PrintUsageRange;
  from?: Date;
  to?: Date;
  kioskId?: string;
  colorMode?: "BW" | "COLOR" | "all";
}) {
  const range = params.range ?? "7d";
  const { from, to } = resolveUsageDateRange(range, params.from, params.to);

  const conditions = [
    eq(printJobs.status, "COMPLETED"),
    gte(printJobs.completedAt, from),
    lte(printJobs.completedAt, to),
  ];
  if (params.kioskId) conditions.push(eq(printJobs.kioskId, params.kioskId));
  if (params.colorMode && params.colorMode !== "all") {
    conditions.push(eq(printJobs.colorMode, params.colorMode));
  }

  const rows = await db
    .select({
      id: printJobs.id,
      kioskId: printJobs.kioskId,
      pageCount: printJobs.pageCount,
      copies: printJobs.copies,
      pageRange: printJobs.pageRange,
      colorMode: printJobs.colorMode,
      physicalSheets: printJobs.physicalSheets,
      completedAt: printJobs.completedAt,
    })
    .from(printJobs)
    .where(and(...conditions));

  const kioskRows = await db.select().from(kiosks);
  const kioskMap = new Map(kioskRows.map((k) => [k.id, k]));

  let totalPages = 0;
  let totalSheets = 0;
  let bwPages = 0;
  let colorPages = 0;
  const byKiosk = new Map<string, { pages: number; sheets: number; bw: number; color: number; jobs: number }>();
  const timeBuckets = new Map<string, { pages: number; sheets: number; jobs: number }>();
  const detailRows: Array<{
    time: Date;
    kiosk_id: string | null;
    kiosk_code: string | null;
    kiosk_name: string | null;
    printer_name: string | null;
    pages: number;
    sheets: number;
    bw_pages: number;
    color_pages: number;
    jobs: number;
  }> = [];

  const isSingleDay = to.getTime() - from.getTime() <= 24 * 60 * 60 * 1000 + 1000;

  for (const row of rows) {
    const pages = jobPages(row as typeof printJobs.$inferSelect);
    const sheets = row.physicalSheets ?? 0;
    totalPages += pages;
    totalSheets += sheets;
    if (row.colorMode === "BW") bwPages += pages;
    else colorPages += pages;

    const kid = row.kioskId ?? "unknown";
    const kioskEntry = byKiosk.get(kid) ?? { pages: 0, sheets: 0, bw: 0, color: 0, jobs: 0 };
    kioskEntry.pages += pages;
    kioskEntry.sheets += sheets;
    kioskEntry.jobs += 1;
    if (row.colorMode === "BW") kioskEntry.bw += pages;
    else kioskEntry.color += pages;
    byKiosk.set(kid, kioskEntry);

    if (row.completedAt) {
      const bucketKey = isSingleDay
        ? `${row.completedAt.getUTCHours().toString().padStart(2, "0")}:00`
        : row.completedAt.toISOString().slice(0, 10);
      const bucket = timeBuckets.get(bucketKey) ?? { pages: 0, sheets: 0, jobs: 0 };
      bucket.pages += pages;
      bucket.sheets += sheets;
      bucket.jobs += 1;
      timeBuckets.set(bucketKey, bucket);
    }
  }

  const activeKiosks = kioskRows.filter((k) => k.status === "ACTIVE").length;

  const pagesByKiosk = [...byKiosk.entries()].map(([kioskId, stats]) => {
    const kiosk = kioskMap.get(kioskId);
    const health = kiosk?.agentHealth as Record<string, unknown> | null;
    return {
      kiosk_id: kioskId,
      kiosk_code: kiosk?.kioskCode ?? null,
      kiosk_name: kiosk?.name ?? null,
      pages: stats.pages,
      sheets: stats.sheets,
      bw_pages: stats.bw,
      color_pages: stats.color,
      jobs: stats.jobs,
    };
  });

  const pagesOverTime = [...timeBuckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, stats]) => ({
      period,
      pages: stats.pages,
      sheets: stats.sheets,
      jobs: stats.jobs,
    }));

  return {
    summary: {
      total_pages: totalPages,
      total_sheets: totalSheets,
      bw_pages: bwPages,
      color_pages: colorPages,
      active_kiosks: activeKiosks,
      completed_jobs: rows.length,
    },
    pages_over_time: pagesOverTime,
    pages_by_kiosk: pagesByKiosk,
    bw_color_by_kiosk: pagesByKiosk.map((k) => ({
      kiosk_code: k.kiosk_code,
      kiosk_name: k.kiosk_name,
      bw_pages: k.bw_pages,
      color_pages: k.color_pages,
    })),
    from,
    to,
    granularity: isSingleDay ? "hourly" : "daily",
  };
}
