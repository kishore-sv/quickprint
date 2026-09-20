/** Client-side pricing helpers (mirrors backend pricing.service). */

import type { PageSet } from "@/lib/types";
import { countPhysicalSheets, parsePageRange } from "@/lib/print-layout";

export { parsePageRange, countPhysicalSheets };

export function filterPagesByPageSet(pages: number[], pageSet: PageSet): number[] {
  const sorted = [...pages].sort((a, b) => a - b);
  if (pageSet === "ODD") return sorted.filter((p) => p % 2 === 1);
  if (pageSet === "EVEN") return sorted.filter((p) => p % 2 === 0);
  return sorted;
}

export function formatPageRange(selected: number[], pageCount: number): string {
  if (selected.length === 0) return "";
  if (selected.length === pageCount) return "all";

  const ranges: string[] = [];
  let start = selected[0];
  let prev = selected[0];

  for (let i = 1; i < selected.length; i++) {
    const p = selected[i];
    if (p === prev + 1) {
      prev = p;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = p;
    prev = p;
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
  return ranges.join(",");
}

export function unitPricePaise(params: {
  colorMode: "BW" | "COLOR";
  duplex: "SINGLE" | "DOUBLE";
  bwPerSheetPaise: number;
  colorPerSheetPaise: number;
}): number {
  const base =
    params.colorMode === "BW" ? params.bwPerSheetPaise : params.colorPerSheetPaise;
  if (params.duplex !== "DOUBLE") return base;
  return params.colorMode === "COLOR" ? base * 2 : Math.round(base * 1.5);
}

export function estimatePrintPricePaise(params: {
  pageCount: number;
  pageRange: string;
  pagesPerSheet: number;
  duplex: "SINGLE" | "DOUBLE";
  copies: number;
  colorMode: "BW" | "COLOR";
  bwPerSheetPaise: number;
  colorPerSheetPaise: number;
  order?: "NORMAL" | "REVERSE";
}): { physicalSheets: number; pagesInRange: number; totalPaise: number } {
  const selected = parsePageRange(params.pageRange, params.pageCount);
  const physicalSheets = countPhysicalSheets(
    params.pageCount,
    params.pageRange,
    params.pagesPerSheet,
    params.duplex,
    params.copies,
    params.order ?? "NORMAL"
  );
  const unit = unitPricePaise({
    colorMode: params.colorMode,
    duplex: params.duplex,
    bwPerSheetPaise: params.bwPerSheetPaise,
    colorPerSheetPaise: params.colorPerSheetPaise,
  });
  return {
    pagesInRange: selected.length,
    physicalSheets,
    totalPaise: physicalSheets * unit,
  };
}

export function estimateJobTotalPaise(
  drafts: Array<{
    pageCount: number;
    pageRange: string;
    settings: {
      pages_per_sheet: number;
      duplex: "SINGLE" | "DOUBLE";
      copies: number;
      color_mode: "BW" | "COLOR";
      order: "NORMAL" | "REVERSE";
    };
  }>,
  pricing: { bw_per_sheet_paise: number; color_per_sheet_paise: number }
) {
  let total = 0;
  let physicalSheets = 0;
  let logicalPages = 0;
  let bwSheets = 0;
  let colorSheets = 0;

  for (const d of drafts) {
    const est = estimatePrintPricePaise({
      pageCount: d.pageCount,
      pageRange: d.pageRange,
      pagesPerSheet: d.settings.pages_per_sheet,
      duplex: d.settings.duplex,
      copies: d.settings.copies,
      colorMode: d.settings.color_mode,
      bwPerSheetPaise: pricing.bw_per_sheet_paise,
      colorPerSheetPaise: pricing.color_per_sheet_paise,
      order: d.settings.order,
    });
    total += est.totalPaise;
    physicalSheets += est.physicalSheets;
    logicalPages += est.pagesInRange;
    if (d.settings.color_mode === "BW") bwSheets += est.physicalSheets;
    else colorSheets += est.physicalSheets;
  }

  return { totalPaise: total, physicalSheets, logicalPages, bwSheets, colorSheets };
}

export function formatRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

export function estimatePrintSeconds(pagesInRange: number, copies: number): number {
  return Math.max(12, Math.round(pagesInRange * copies * 6.5));
}
