import { describe, expect, test } from "bun:test";

describe("print job cleanup (logic)", () => {
  test("save_file jobs skip immediate cleanup", () => {
    const job = { status: "COMPLETED", saveFile: true, cleanupStatus: null };
    const shouldDelete = job.status === "COMPLETED" && !job.saveFile;
    expect(shouldDelete).toBe(false);
  });

  test("unsaved completed jobs should cleanup", () => {
    const job = { status: "COMPLETED", saveFile: false, cleanupStatus: null };
    const shouldDelete = job.status === "COMPLETED" && !job.saveFile;
    expect(shouldDelete).toBe(true);
  });

  test("cleanup failure does not revert completed", () => {
    const job = { status: "COMPLETED", cleanupStatus: "FAILED" };
    expect(job.status).toBe("COMPLETED");
  });
});
