import { describe, expect, test } from "bun:test";
import { piMessageTypeToStatus } from "../src/ws/kiosk-agent.protocol";
import { classifyPiFailure } from "../src/utils/print-errors";

describe("pi status update mapping", () => {
  test("all lifecycle message types map", () => {
    expect(piMessageTypeToStatus("job.received")).toBe("RECEIVED");
    expect(piMessageTypeToStatus("job.downloading")).toBe("DOWNLOADING");
    expect(piMessageTypeToStatus("job.ready")).toBe("READY");
    expect(piMessageTypeToStatus("job.submitted")).toBe("SUBMITTED");
    expect(piMessageTypeToStatus("job.printing")).toBe("PRINTING");
    expect(piMessageTypeToStatus("job.completed")).toBe("COMPLETED");
    expect(piMessageTypeToStatus("job.failed")).toBe("FAILED");
  });

  test("duplicate completed is same key", () => {
    expect(piMessageTypeToStatus("job.completed")).toBe(
      piMessageTypeToStatus("job.completed")
    );
  });

  test("classify download failures", () => {
    expect(classifyPiFailure("HTTP download failed")).toBe("FILE_DOWNLOAD_FAILED");
  });

  test("classify timeout failures", () => {
    expect(classifyPiFailure("operation timed out")).toBe("JOB_TIMEOUT");
  });
});
