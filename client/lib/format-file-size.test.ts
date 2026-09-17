import { describe, expect, test } from "bun:test";
import { formatFileSize } from "./format-file-size";

describe("formatFileSize", () => {
  test("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  test("formats kilobytes", () => {
    expect(formatFileSize(100_000)).toBe("100 KB");
  });

  test("does not show large KB values", () => {
    expect(formatFileSize(1_708_032)).toBe("1.7 MB");
  });

  test("formats megabytes", () => {
    expect(formatFileSize(5_000_000)).toBe("5.0 MB");
  });

  test("formats gigabytes", () => {
    expect(formatFileSize(2_500_000_000)).toBe("2.5 GB");
  });
});
