import { describe, expect, test } from "bun:test";
import { estimatePrintPricePaise, unitPricePaise } from "./print-pricing";

const RATES = { bwPerSheetPaise: 200, colorPerSheetPaise: 1000 };

describe("print-pricing", () => {
  test("single bw one page", () => {
    const est = estimatePrintPricePaise({
      pageCount: 1,
      pageRange: "all",
      pagesPerSheet: 1,
      duplex: "SINGLE",
      copies: 1,
      colorMode: "BW",
      ...RATES,
    });
    expect(est.physicalSheets).toBe(1);
    expect(est.totalPaise).toBe(200);
  });

  test("duplex bw one page uses 1.5x rate", () => {
    const est = estimatePrintPricePaise({
      pageCount: 1,
      pageRange: "all",
      pagesPerSheet: 1,
      duplex: "DOUBLE",
      copies: 1,
      colorMode: "BW",
      ...RATES,
    });
    expect(est.physicalSheets).toBe(1);
    expect(est.totalPaise).toBe(300);
  });

  test("single color one page", () => {
    const est = estimatePrintPricePaise({
      pageCount: 1,
      pageRange: "all",
      pagesPerSheet: 1,
      duplex: "SINGLE",
      copies: 1,
      colorMode: "COLOR",
      ...RATES,
    });
    expect(est.totalPaise).toBe(1000);
  });

  test("duplex color one page uses 2x color rate", () => {
    const est = estimatePrintPricePaise({
      pageCount: 1,
      pageRange: "all",
      pagesPerSheet: 1,
      duplex: "DOUBLE",
      copies: 1,
      colorMode: "COLOR",
      ...RATES,
    });
    expect(est.totalPaise).toBe(2000);
  });

  test("unitPricePaise helper", () => {
    expect(
      unitPricePaise({
        colorMode: "BW",
        duplex: "SINGLE",
        ...RATES,
      })
    ).toBe(200);
    expect(
      unitPricePaise({
        colorMode: "COLOR",
        duplex: "DOUBLE",
        ...RATES,
      })
    ).toBe(2000);
  });
});
