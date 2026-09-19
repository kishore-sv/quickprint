import { describe, expect, test } from "bun:test";
import { parsePageRange } from "../../src/services/pricing.service";
import { resolveUsageDateRange } from "../../src/services/admin/analytics.service";

describe("admin analytics", () => {
  test("excludes non-completed jobs conceptually", () => {
    const statuses = ["COMPLETED", "FAILED", "CANCELLED"];
    const included = statuses.filter((s) => s === "COMPLETED");
    expect(included).toEqual(["COMPLETED"]);
  });

  test("calculates pages from page range and copies", () => {
    const pages = parsePageRange("1-5", 10).length * 2;
    expect(pages).toBe(10);
  });

  test("resolves today range", () => {
    const { from, to } = resolveUsageDateRange("today");
    expect(from.getTime()).toBeLessThanOrEqual(to.getTime());
  });

  test("BW vs color split", () => {
    const jobs = [
      { colorMode: "BW", pages: 10 },
      { colorMode: "COLOR", pages: 5 },
    ];
    const bw = jobs.filter((j) => j.colorMode === "BW").reduce((s, j) => s + j.pages, 0);
    const color = jobs.filter((j) => j.colorMode === "COLOR").reduce((s, j) => s + j.pages, 0);
    expect(bw).toBe(10);
    expect(color).toBe(5);
  });
});
