import { describe, expect, test } from "bun:test";
import { isJobFileInStorage } from "../src/services/job-file-availability";

describe("isJobFileInStorage", () => {
  test("returns false when cleanup succeeded", () => {
    expect(
      isJobFileInStorage({
        cleanupStatus: "SUCCESS",
        saveFile: false,
        fileRetentionUntil: null,
      })
    ).toBe(false);
  });

  test("returns true for unsaved failed job with no cleanup", () => {
    expect(
      isJobFileInStorage({
        cleanupStatus: null,
        saveFile: false,
        fileRetentionUntil: null,
      })
    ).toBe(true);
  });

  test("saved file requires active retention", () => {
    const future = new Date(Date.now() + 86400000);
    const past = new Date(Date.now() - 86400000);
    expect(
      isJobFileInStorage({
        cleanupStatus: null,
        saveFile: true,
        fileRetentionUntil: future,
      })
    ).toBe(true);
    expect(
      isJobFileInStorage({
        cleanupStatus: null,
        saveFile: true,
        fileRetentionUntil: past,
      })
    ).toBe(false);
  });
});
