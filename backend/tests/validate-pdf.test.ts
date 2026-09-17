import { describe, expect, test } from "bun:test";
import { validatePdf } from "../src/files/pdf.utils";
import { ValidationError } from "../src/utils/errors";
import { minimalPdfBuffer } from "./helpers/minimal-pdf";

describe("validatePdf", () => {
  test("accepts valid PDF", async () => {
    const result = await validatePdf(minimalPdfBuffer());
    expect(result.pageCount).toBeGreaterThanOrEqual(1);
    expect(result.fileHash).toMatch(/^[a-f0-9]{64}$/);
  });

  test("rejects too-small buffer", async () => {
    await expect(validatePdf(Buffer.from("tiny"))).rejects.toThrow(ValidationError);
  });

  test("rejects invalid PDF header", async () => {
    const bad = Buffer.alloc(32, 0);
    bad.write("NOTPDF", 0);
    bad.write("%%EOF", bad.length - 8);
    await expect(validatePdf(bad)).rejects.toThrow(ValidationError);
  });

  test("rejects PDF missing EOF marker", async () => {
    const bad = Buffer.from("%PDF-1.4\nno eof here");
    await expect(validatePdf(bad)).rejects.toThrow(ValidationError);
  });
});
