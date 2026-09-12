import { describe, expect, test } from "bun:test";
import { sanitizeFilename, validateUploadMime } from "../src/files/pdf.utils";
import { ValidationError } from "../src/utils/errors";

describe("pdf utils", () => {
  test("sanitize filename forces pdf extension", () => {
    expect(sanitizeFilename("doc")).toMatch(/\.pdf$/i);
  });

  test("reject unsupported mime", () => {
    expect(() => validateUploadMime("application/x-msdownload", "evil.exe")).toThrow(ValidationError);
  });

  test("allow pdf extension fallback", () => {
    expect(() => validateUploadMime("application/octet-stream", "file.pdf")).not.toThrow();
  });
});
