import { eq } from "drizzle-orm";
import { db } from "../db";
import { pricingRules } from "../db/schema";
import type { DuplexMode, ColorMode } from "../types/enums";
import {
  countPhysicalSheets,
  parsePageRange,
  validatePageRangeFormat,
} from "./print-layout.service";

export { countPhysicalSheets };

export type PriceBreakdown = {
  pages_in_range: number;
  physical_sheets: number;
  unit_price_paise: number;
  total_paise: number;
  currency: string;
  color_mode: string;
};

export { parsePageRange, validatePageRangeFormat };

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
  order?: "NORMAL" | "REVERSE";
}): PriceBreakdown {
  const physical = countPhysicalSheets(
    params.pageCount,
    params.pageRange,
    params.pagesPerSheet,
    params.duplex,
    params.copies,
    params.order ?? "NORMAL"
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

export type AggregatedPriceBreakdown = {
  total_logical_pages: number;
  physical_sheets: number;
  bw_physical_sheets: number;
  color_physical_sheets: number;
  total_paise: number;
  currency: string;
  documents: PriceBreakdown[];
};

export function aggregatePriceBreakdowns(
  breakdowns: PriceBreakdown[],
  currency = "INR"
): AggregatedPriceBreakdown {
  let totalLogical = 0;
  let physicalSheets = 0;
  let bwPhysical = 0;
  let colorPhysical = 0;
  let totalPaise = 0;

  for (const b of breakdowns) {
    totalLogical += b.pages_in_range;
    physicalSheets += b.physical_sheets;
    totalPaise += b.total_paise;
    if (b.color_mode === "BW") {
      bwPhysical += b.physical_sheets;
    } else {
      colorPhysical += b.physical_sheets;
    }
  }

  return {
    total_logical_pages: totalLogical,
    physical_sheets: physicalSheets,
    bw_physical_sheets: bwPhysical,
    color_physical_sheets: colorPhysical,
    total_paise: totalPaise,
    currency,
    documents: breakdowns,
  };
}

type Rates = { bwPaise: number; colorPaise: number; currency: string };

const RATES_CACHE_TTL_MS = 60_000;
let ratesCache: { at: number; value: Rates } | null = null;

export async function getActiveRates(): Promise<Rates> {
  const now = Date.now();
  if (ratesCache && now - ratesCache.at < RATES_CACHE_TTL_MS) {
    return ratesCache.value;
  }

  const rows = await db
    .select({
      bwPerSheetPaise: pricingRules.bwPerSheetPaise,
      colorPerSheetPaise: pricingRules.colorPerSheetPaise,
      currency: pricingRules.currency,
    })
    .from(pricingRules)
    .where(eq(pricingRules.isActive, true))
    .orderBy(pricingRules.createdAt)
    .limit(1);

  const rule = rows[0];
  let value: Rates;
  if (rule) {
    value = {
      bwPaise: rule.bwPerSheetPaise,
      colorPaise: rule.colorPerSheetPaise,
      currency: rule.currency,
    };
  } else {
    const { env } = await import("../config/env");
    value = {
      bwPaise: env.DEFAULT_BW_SHEET_PAISE,
      colorPaise: env.DEFAULT_COLOR_SHEET_PAISE,
      currency: "INR",
    };
  }
  ratesCache = { at: now, value };
  return value;
}
