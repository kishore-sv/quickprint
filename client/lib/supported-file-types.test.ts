import { describe, expect, test } from "bun:test";
import {
  isPdf,
  isServerConvertedUpload,
  isSupportedImage,
  isSupportedUploadFile,
  isWordDocument,
  SUPPORTED_FILE_ACCEPT,
} from "./supported-file-types";

function makeFile(name: string, type: string): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

describe("supported-file-types", () => {
  test("accept map includes required mime types", () => {
    expect(SUPPORTED_FILE_ACCEPT["application/pdf"]).toEqual([".pdf"]);
    expect(SUPPORTED_FILE_ACCEPT["application/msword"]).toEqual([".doc"]);
    expect(SUPPORTED_FILE_ACCEPT["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]).toEqual([
      ".docx",
    ]);
    expect(SUPPORTED_FILE_ACCEPT["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]).toEqual([
      ".xlsx",
    ]);
    expect(SUPPORTED_FILE_ACCEPT["text/plain"]).toEqual([".txt"]);
    expect(SUPPORTED_FILE_ACCEPT["image/jpeg"]).toEqual([".jpg", ".jpeg"]);
    expect(SUPPORTED_FILE_ACCEPT["image/png"]).toEqual([".png"]);
  });

  test("detects supported upload files", () => {
    expect(isPdf(makeFile("doc.pdf", "application/pdf"))).toBe(true);
    expect(isWordDocument(makeFile("notes.doc", "application/msword"))).toBe(true);
    expect(
      isWordDocument(
        makeFile(
          "notes.docx",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
      )
    ).toBe(true);
    expect(
      isServerConvertedUpload(
        makeFile(
          "report.xlsx",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
      )
    ).toBe(true);
    expect(isServerConvertedUpload(makeFile("notes.txt", "text/plain"))).toBe(true);
    expect(isSupportedImage(makeFile("photo.jpg", "image/jpeg"))).toBe(true);
    expect(isSupportedImage(makeFile("photo.png", "image/png"))).toBe(true);
    expect(isSupportedUploadFile(makeFile("doc.pdf", "application/pdf"))).toBe(true);
    expect(
      isSupportedUploadFile(
        makeFile(
          "report.xlsx",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
      )
    ).toBe(true);
    expect(isSupportedUploadFile(makeFile("notes.txt", "text/plain"))).toBe(true);
  });

  test("rejects unsupported files", () => {
    expect(isSupportedUploadFile(makeFile("photo.webp", "image/webp"))).toBe(false);
    expect(isSupportedUploadFile(makeFile("photo.heic", "image/heic"))).toBe(false);
    expect(isSupportedUploadFile(makeFile("anim.gif", "image/gif"))).toBe(false);
    expect(isSupportedUploadFile(makeFile("archive.zip", "application/zip"))).toBe(false);
  });
});
