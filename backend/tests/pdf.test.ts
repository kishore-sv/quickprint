import { describe, expect, test } from "bun:test";
import {
  sanitizeFilename,
  sanitizeOriginalFilename,
  storagePdfFilename,
  validateUploadMime,
} from "../src/files/pdf.utils";
import { ValidationError } from "../src/utils/errors";

describe("pdf utils", () => {
  test("sanitize filename forces pdf extension", () => {
    expect(sanitizeFilename("doc")).toMatch(/\.pdf$/i);
  });

  test("sanitize original filename preserves user extension", () => {
    expect(sanitizeOriginalFilename("report.docx")).toBe("report.docx");
    expect(sanitizeOriginalFilename("photo.PNG")).toBe("photo.PNG");
  });

  test("storage pdf filename is internal pdf name", () => {
    expect(storagePdfFilename("report.docx")).toMatch(/\.pdf$/i);
    expect(storagePdfFilename("photo.png")).toMatch(/\.pdf$/i);
  });

  test("reject unsupported mime", () => {
    expect(() => validateUploadMime("application/x-msdownload", "evil.exe")).toThrow(ValidationError);
  });

  test("allow pdf extension fallback", () => {
    expect(() => validateUploadMime("application/octet-stream", "file.pdf")).not.toThrow();
  });

  test("allows supported mime types", () => {
    expect(() => validateUploadMime("application/pdf", "a.pdf")).not.toThrow();
    expect(() => validateUploadMime("application/msword", "a.doc")).not.toThrow();
    expect(() =>
      validateUploadMime(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "a.docx"
      )
    ).not.toThrow();
    expect(() => validateUploadMime("image/jpeg", "a.jpg")).not.toThrow();
    expect(() => validateUploadMime("image/png", "a.png")).not.toThrow();
  });

  test("allows supported extensions with generic mime", () => {
    expect(() => validateUploadMime("application/octet-stream", "scan.jpeg")).not.toThrow();
    expect(() => validateUploadMime("application/octet-stream", "notes.doc")).not.toThrow();
    expect(() => validateUploadMime("application/octet-stream", "notes.docx")).not.toThrow();
  });

  test("rejects unsupported formats", () => {
    const unsupported = [
      ["image/webp", "photo.webp"],
      ["image/heic", "photo.heic"],
      ["image/gif", "anim.gif"],
      ["application/vnd.ms-excel", "sheet.xls"],
      [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "sheet.xlsx",
      ],
      ["application/vnd.ms-powerpoint", "slides.ppt"],
      [
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "slides.pptx",
      ],
      ["text/plain", "notes.txt"],
      ["application/zip", "archive.zip"],
      ["application/x-msdownload", "virus.exe"],
    ] as const;

    for (const [mime, name] of unsupported) {
      expect(() => validateUploadMime(mime, name)).toThrow(ValidationError);
    }
  });
});
