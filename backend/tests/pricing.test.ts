import { describe, expect, test } from "bun:test";
import {
  buildPriceBreakdown,
  countPhysicalSheets,
  parsePageRange,
  validatePageRangeFormat,
} from "../src/services/pricing.service";

describe("pricing", () => {
  test("parse page range all", () => {
    expect(parsePageRange("all", 5)).toEqual([1, 2, 3, 4, 5]);
  });

  test("physical sheets duplex and n-up", () => {
    const sheets = countPhysicalSheets(10, "1-10", 2, "DOUBLE", 1);
    expect(sheets).toBe(3);
  });

  test("price breakdown bw", () => {
    const b = buildPriceBreakdown({
      pageCount: 10,
      pageRange: "all",
      pagesPerSheet: 1,
      duplex: "SINGLE",
      copies: 2,
      colorMode: "BW",
      bwPaise: 200,
      colorPaise: 300,
    });
    expect(b.physical_sheets).toBe(20);
    expect(b.total_paise).toBe(4000);
  });

  test("validate page range format", () => {
    expect(validatePageRangeFormat("1-3,5")).toBe(true);
    expect(validatePageRangeFormat("bad!")).toBe(false);
  });
});
