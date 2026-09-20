import { describe, expect, test } from "bun:test";
import {
  buildPriceBreakdown,
  countPhysicalSheets,
  parsePageRange,
  unitPricePaise,
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

  test("unit price duplex 1.5x on bw", () => {
    expect(
      unitPricePaise({
        colorMode: "BW",
        duplex: "DOUBLE",
        bwPaise: 200,
        colorPaise: 300,
      })
    ).toBe(300);
  });

  test("unit price color single-sided", () => {
    expect(
      unitPricePaise({
        colorMode: "COLOR",
        duplex: "SINGLE",
        bwPaise: 200,
        colorPaise: 300,
      })
    ).toBe(300);
  });

  test("price breakdown duplex bw one page", () => {
    const b = buildPriceBreakdown({
      pageCount: 1,
      pageRange: "all",
      pagesPerSheet: 1,
      duplex: "DOUBLE",
      copies: 1,
      colorMode: "BW",
      bwPaise: 200,
      colorPaise: 300,
    });
    expect(b.physical_sheets).toBe(1);
    expect(b.unit_price_paise).toBe(300);
    expect(b.total_paise).toBe(300);
  });

  test("price breakdown color duplex one page", () => {
    const b = buildPriceBreakdown({
      pageCount: 1,
      pageRange: "all",
      pagesPerSheet: 1,
      duplex: "DOUBLE",
      copies: 1,
      colorMode: "COLOR",
      bwPaise: 200,
      colorPaise: 300,
    });
    expect(b.physical_sheets).toBe(1);
    expect(b.unit_price_paise).toBe(450);
    expect(b.total_paise).toBe(450);
  });

  test("validate page range format", () => {
    expect(validatePageRangeFormat("1-3,5")).toBe(true);
    expect(validatePageRangeFormat("bad!")).toBe(false);
  });
});
