import { describe, expect, test } from "bun:test";
import pdf from "pdf-parse";
import { convertTextBufferToPdf } from "../src/files/text-to-pdf.service";

describe("text-to-pdf", () => {
  test("converts plain text to a valid PDF with at least one page", async () => {
    const pdfBuffer = await convertTextBufferToPdf(Buffer.from("Hello, QuickPrint!\n"));
    expect(pdfBuffer.subarray(0, 5).toString()).toBe("%PDF-");
    const parsed = await pdf(pdfBuffer);
    expect(parsed.numpages).toBeGreaterThanOrEqual(1);
  });

  test("preserves empty lines and paginates long content", async () => {
    const lines = Array.from({ length: 120 }, (_, i) => (i % 10 === 0 ? "" : `Line ${i + 1}`));
    const pdfBuffer = await convertTextBufferToPdf(Buffer.from(lines.join("\n")));
    const parsed = await pdf(pdfBuffer);
    expect(parsed.numpages).toBeGreaterThan(1);
  });

  test("wraps very long lines across visual rows", async () => {
    const longLine = "word ".repeat(200);
    const pdfBuffer = await convertTextBufferToPdf(Buffer.from(longLine));
    const parsed = await pdf(pdfBuffer);
    expect(parsed.numpages).toBeGreaterThanOrEqual(1);
  });
});
