import { describe, expect, test } from "bun:test";
import {
  assertDocBuffer,
  assertDocxBuffer,
  assertJpegBuffer,
  assertPdfBufferHeader,
  assertPngBuffer,
  detectUploadKind,
} from "../src/files/file-content.utils";
import { minimalPdfBuffer } from "./helpers/minimal-pdf";
import { ValidationError } from "../src/utils/errors";

describe("file content validation", () => {
  test("accepts JPEG magic bytes", () => {
    expect(() => assertJpegBuffer(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).not.toThrow();
  });

  test("rejects invalid JPEG", () => {
    expect(() => assertJpegBuffer(Buffer.from([0x00, 0x00, 0x00]))).toThrow(ValidationError);
  });

  test("accepts PNG magic bytes", () => {
    expect(() => assertPngBuffer(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00]))).not.toThrow();
  });

  test("rejects invalid PNG", () => {
    expect(() => assertPngBuffer(Buffer.from([0x00, 0x00, 0x00]))).toThrow(ValidationError);
  });

  test("accepts DOC OLE header", () => {
    const doc = Buffer.alloc(8);
    doc.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(() => assertDocBuffer(doc)).not.toThrow();
  });

  test("rejects invalid DOC", () => {
    expect(() => assertDocBuffer(Buffer.from("not-a-doc"))).toThrow(ValidationError);
  });

  test("accepts DOCX zip package markers", () => {
    const docx = Buffer.from("PK\x03\x04word/document.xml[Content_Types].xml");
    expect(() => assertDocxBuffer(docx)).not.toThrow();
  });

  test("rejects invalid DOCX", () => {
    expect(() => assertDocxBuffer(Buffer.from("PK\x03\x04not-word"))).toThrow(ValidationError);
  });

  test("accepts PDF header", () => {
    expect(() => assertPdfBufferHeader(Buffer.from("%PDF-1.4"))).not.toThrow();
  });

  test("rejects non-PDF header", () => {
    expect(() => assertPdfBufferHeader(Buffer.from("NOTPDF"))).toThrow(ValidationError);
  });

  test("detects client-converted PDF even when multipart name is png", () => {
    const pdf = minimalPdfBuffer();
    expect(detectUploadKind("application/pdf", "scanner.pdf", pdf)).toBe("pdf");
    expect(detectUploadKind("application/pdf", "me-prof.png", pdf)).toBe("pdf");
  });

  test("detects raw doc and docx uploads", () => {
    const docx = Buffer.from("PK\x03\x04word/document.xml[Content_Types].xml");
    const doc = Buffer.alloc(8);
    doc.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(detectUploadKind("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "a.docx", docx)).toBe("docx");
    expect(detectUploadKind("application/msword", "a.doc", doc)).toBe("doc");
  });

  test("detects raw image uploads", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00]);
    expect(detectUploadKind("image/png", "photo.png", png)).toBe("image");
  });

  test("detects xlsx and xls uploads", () => {
    const xlsx = Buffer.from("PK\x03\x04xl/workbook.xml[Content_Types].xml");
    expect(
      detectUploadKind(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "report.xlsx",
        xlsx
      )
    ).toBe("xlsx");

    const xls = Buffer.alloc(8);
    xls.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(detectUploadKind("application/vnd.ms-excel", "report.xls", xls)).toBe("xls");
  });

  test("detects txt csv and rtf uploads", () => {
    expect(detectUploadKind("text/plain", "notes.txt", Buffer.from("Hello world"))).toBe("txt");
    expect(detectUploadKind("text/csv", "data.csv", Buffer.from("a,b\n1,2"))).toBe("csv");
    expect(detectUploadKind("application/rtf", "doc.rtf", Buffer.from("{\\rtf1\\ansi"))).toBe("rtf");
  });

  test("distinguishes OLE doc from xls by extension", () => {
    const ole = Buffer.alloc(8);
    ole.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(detectUploadKind("application/msword", "a.doc", ole)).toBe("doc");
    expect(detectUploadKind("application/vnd.ms-excel", "a.xls", ole)).toBe("xls");
    expect(() => detectUploadKind("application/octet-stream", "mystery.bin", ole)).toThrow(
      ValidationError
    );
  });
});
