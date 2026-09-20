import { describe, expect, test } from "bun:test";
import {
  buildPrintSheetLayout,
  countPhysicalSheets,
  parsePageRange,
} from "../src/services/print-layout.service";

describe("print-layout", () => {
  test("parsePageRange all", () => {
    expect(parsePageRange("all", 5)).toEqual([1, 2, 3, 4, 5]);
  });

  test("2-up single-sided layout", () => {
    const layout = buildPrintSheetLayout({
      pageCount: 4,
      pageRange: "all",
      pagesPerSheet: 2,
      duplex: "SINGLE",
      order: "NORMAL",
    });
    expect(layout).toHaveLength(2);
    expect(layout[0]!.front.pageNumbers).toEqual([1, 2]);
    expect(layout[1]!.front.pageNumbers).toEqual([3, 4]);
  });

  test("2-up duplex layout", () => {
    const layout = buildPrintSheetLayout({
      pageCount: 4,
      pageRange: "all",
      pagesPerSheet: 2,
      duplex: "DOUBLE",
      order: "NORMAL",
    });
    expect(layout).toHaveLength(1);
    expect(layout[0]!.front.pageNumbers).toEqual([1, 2]);
    expect(layout[0]!.back?.pageNumbers).toEqual([3, 4]);
  });

  test("physical sheets with copies", () => {
    expect(
      countPhysicalSheets(8, "all", 2, "SINGLE", 2, "NORMAL")
    ).toBe(8);
  });
});
