/** Client-side pricing helpers (mirrors backend pricing.service). */

import type { PageSet } from "@/lib/types";

export function filterPagesByPageSet(pages: number[], pageSet: PageSet): number[] {
  const sorted = [...pages].sort((a, b) => a - b);
  if (pageSet === "ODD") return sorted.filter((p) => p % 2 === 1);
  if (pageSet === "EVEN") return sorted.filter((p) => p % 2 === 0);
  return sorted;
}

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

  return [...pages].sort((a, b) => a - b);
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

export function countPhysicalSheets(
  pageCount: number,
  pageRange: string,
  pagesPerSheet: number,
  duplex: "SINGLE" | "DOUBLE",
  copies: number
): number {
  const selected = parsePageRange(pageRange, pageCount);
  const logicalPerCopy = Math.ceil(selected.length / pagesPerSheet);
  const physicalPerCopy =
    duplex === "DOUBLE" ? Math.ceil(logicalPerCopy / 2) : logicalPerCopy;
  return physicalPerCopy * copies;
}

export function estimatePrintPricePaise(params: {
  pageCount: number;
  pageRange: string;
  pagesPerSheet: number;
  duplex: "SINGLE" | "DOUBLE";
  copies: number;
  bwPerSheetPaise: number;
}): { physicalSheets: number; pagesInRange: number; totalPaise: number } {
  const selected = parsePageRange(params.pageRange, params.pageCount);
  const physicalSheets = countPhysicalSheets(
    params.pageCount,
    params.pageRange,
    params.pagesPerSheet,
    params.duplex,
    params.copies
  );
  return {
    pagesInRange: selected.length * params.copies,
    physicalSheets,
    totalPaise: physicalSheets * params.bwPerSheetPaise,
  };
}

export function formatRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

export function estimatePrintSeconds(pagesInRange: number, copies: number): number {
  return Math.max(12, Math.round(pagesInRange * copies * 6.5));
}
