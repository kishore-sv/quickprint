import { eq } from "drizzle-orm";
import { db } from "../db";
import { pricingRules } from "../db/schema";
import type { DuplexMode, ColorMode } from "../types/enums";
import { ValidationError } from "../utils/errors";

export type PriceBreakdown = {
  pages_in_range: number;
  physical_sheets: number;
  unit_price_paise: number;
  total_paise: number;
  currency: string;
  color_mode: string;
};

export function parsePageRange(pageRange: string, pageCount: number): number[] {
  const text = pageRange.trim().toLowerCase();
  if (text === "" || text === "all" || text === "*") {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  for (const part of text.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes("-")) {
      const [startS, endS] = trimmed.split("-", 2);
      let start = parseInt(startS, 10);
      let end = parseInt(endS, 10);
      if (start > end) [start, end] = [end, start];
      for (let p = start; p <= end; p++) {
        if (p >= 1 && p <= pageCount) pages.add(p);
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (p >= 1 && p <= pageCount) pages.add(p);
    }
  }

  if (pages.size === 0) throw new ValidationError("Page range selects no valid pages");
  return [...pages].sort((a, b) => a - b);
}

export function countPhysicalSheets(
  pageCount: number,
  pageRange: string,
  pagesPerSheet: number,
  duplex: DuplexMode,
  copies: number
): number {
  if (pagesPerSheet < 1) throw new ValidationError("pages_per_sheet must be >= 1");
  if (copies < 1) throw new ValidationError("copies must be >= 1");

  const selected = parsePageRange(pageRange, pageCount);
  const logicalPerCopy = Math.ceil(selected.length / pagesPerSheet);
  const physicalPerCopy =
    duplex === "DOUBLE" ? Math.ceil(logicalPerCopy / 2) : logicalPerCopy;
  return physicalPerCopy * copies;
}

export function validatePageRangeFormat(pageRange: string): boolean {
  if (["", "all", "*"].includes(pageRange.trim().toLowerCase())) return true;
  return /^[\d,\-\s]+$/.test(pageRange.trim());
}

export function buildPriceBreakdown(params: {
  pageCount: number;
  pageRange: string;
  pagesPerSheet: number;
  duplex: DuplexMode;
  copies: number;
  colorMode: ColorMode;
  bwPaise: number;
  colorPaise: number;
  currency?: string;
}): PriceBreakdown {
  const physical = countPhysicalSheets(
    params.pageCount,
    params.pageRange,
    params.pagesPerSheet,
    params.duplex,
    params.copies
  );
  const unit = params.colorMode === "BW" ? params.bwPaise : params.colorPaise;
  const pagesInRange = parsePageRange(params.pageRange, params.pageCount).length;
  return {
    pages_in_range: pagesInRange,
    physical_sheets: physical,
    unit_price_paise: unit,
    total_paise: physical * unit,
    currency: params.currency ?? "INR",
    color_mode: params.colorMode,
  };
}

export async function getActiveRates(): Promise<{
  bwPaise: number;
  colorPaise: number;
  currency: string;
}> {
  const rows = await db
    .select()
    .from(pricingRules)
    .where(eq(pricingRules.isActive, true))
    .orderBy(pricingRules.createdAt)
    .limit(1);

  const rule = rows[0];
  if (rule) {
    return {
      bwPaise: rule.bwPerSheetPaise,
      colorPaise: rule.colorPerSheetPaise,
      currency: rule.currency,
    };
  }
  const { env } = await import("../config/env");
  return {
    bwPaise: env.DEFAULT_BW_SHEET_PAISE,
    colorPaise: env.DEFAULT_COLOR_SHEET_PAISE,
    currency: "INR",
  };
}
