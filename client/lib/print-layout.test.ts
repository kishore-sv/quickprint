import { describe, expect, test } from "bun:test";
import { buildPrintSheetLayout, countPhysicalSheets } from "./print-layout";

describe("client print-layout", () => {
  test("matches backend 2-up duplex", () => {
    const layout = buildPrintSheetLayout({
      pageCount: 4,
      pageRange: "all",
      pagesPerSheet: 2,
      duplex: "DOUBLE",
      order: "NORMAL",
    });
    expect(layout).toHaveLength(1);
    expect(layout[0]!.back?.pageNumbers).toEqual([3, 4]);
  });

  test("6-up sheet count", () => {
    expect(countPhysicalSheets(12, "all", 6, "SINGLE", 1)).toBe(2);
  });
});
