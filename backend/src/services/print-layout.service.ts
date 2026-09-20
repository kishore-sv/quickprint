import type { DuplexMode } from "../types/enums";
import { ValidationError } from "../utils/errors";

export type PrintSheetSide = {
  pageNumbers: number[];
};

export type PrintSheetLayout = {
  sheetNumber: number;
  front: PrintSheetSide;
  back: PrintSheetSide | null;
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

export function orderPages(pageNumbers: number[], order: "NORMAL" | "REVERSE"): number[] {
  if (order === "REVERSE") return [...pageNumbers].reverse();
  return pageNumbers;
}

/** Chunk pages into N-up groups (one physical side). */
export function chunkPagesForNup(pageNumbers: number[], pagesPerSheet: number): number[][] {
  const chunks: number[][] = [];
  for (let i = 0; i < pageNumbers.length; i += pagesPerSheet) {
    chunks.push(pageNumbers.slice(i, i + pagesPerSheet));
  }
  return chunks;
}

/**
 * Build physical sheet layout from logical document pages and print settings.
 * Front/back represent physical sheet sides; empty slots are omitted from arrays.
 */
export function buildPrintSheetLayout(params: {
  pageCount: number;
  pageRange: string;
  pagesPerSheet: number;
  duplex: DuplexMode;
  order: "NORMAL" | "REVERSE";
}): PrintSheetLayout[] {
  const { pageCount, pageRange, pagesPerSheet, duplex, order } = params;
  if (pagesPerSheet < 1) throw new ValidationError("pages_per_sheet must be >= 1");

  const selected = orderPages(parsePageRange(pageRange, pageCount), order);
  const sides = chunkPagesForNup(selected, pagesPerSheet);

  if (duplex === "SINGLE") {
    return sides.map((frontPages, index) => ({
      sheetNumber: index + 1,
      front: { pageNumbers: frontPages },
      back: null,
    }));
  }

  const sheets: PrintSheetLayout[] = [];
  for (let i = 0; i < sides.length; i += 2) {
    const frontPages = sides[i] ?? [];
    const backPages = sides[i + 1] ?? [];
    sheets.push({
      sheetNumber: sheets.length + 1,
      front: { pageNumbers: frontPages },
      back: backPages.length > 0 ? { pageNumbers: backPages } : null,
    });
  }
  return sheets;
}

export function countPhysicalSheetsFromLayout(layout: PrintSheetLayout[]): number {
  return layout.length;
}

export function countPhysicalSheets(
  pageCount: number,
  pageRange: string,
  pagesPerSheet: number,
  duplex: DuplexMode,
  copies: number,
  order: "NORMAL" | "REVERSE" = "NORMAL"
): number {
  if (copies < 1) throw new ValidationError("copies must be >= 1");
  const layout = buildPrintSheetLayout({
    pageCount,
    pageRange,
    pagesPerSheet,
    duplex,
    order,
  });
  return layout.length * copies;
}

export function validatePageRangeFormat(pageRange: string): boolean {
  if (["", "all", "*"].includes(pageRange.trim().toLowerCase())) return true;
  return /^[\d,\-\s]+$/.test(pageRange.trim());
}
