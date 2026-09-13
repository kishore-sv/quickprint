import { describe, expect, test } from "bun:test";
import { piMessageTypeToStatus } from "../src/ws/kiosk-agent.protocol";
import { PiOutboundType } from "../src/ws/kiosk-agent.protocol";
import {
  PI_PHASE_TO_DB_STATUS,
  piPhaseRank,
} from "../src/services/print-job-lifecycle";

describe("pi status mapping", () => {
  test("maps received to claimed db status with received phase", () => {
    const key = piMessageTypeToStatus(PiOutboundType.JOB_RECEIVED);
    expect(key).toBe("RECEIVED");
    expect(PI_PHASE_TO_DB_STATUS[key!]).toBe("CLAIMED");
  });

  test("maps ready to downloading db status with ready phase", () => {
    const key = piMessageTypeToStatus(PiOutboundType.JOB_READY);
    expect(key).toBe("READY");
    expect(PI_PHASE_TO_DB_STATUS[key!]).toBe("DOWNLOADING");
  });

  test("maps printing and completed", () => {
    expect(PI_PHASE_TO_DB_STATUS[piMessageTypeToStatus(PiOutboundType.JOB_PRINTING)!]).toBe(
      "PRINTING"
    );
    expect(PI_PHASE_TO_DB_STATUS[piMessageTypeToStatus(PiOutboundType.JOB_COMPLETED)!]).toBe(
      "COMPLETED"
    );
  });

  test("pi phase rank is monotonic forward", () => {
    expect(piPhaseRank("RECEIVED")).toBeLessThan(piPhaseRank("DOWNLOADING"));
    expect(piPhaseRank("DOWNLOADING")).toBeLessThan(piPhaseRank("READY"));
    expect(piPhaseRank("READY")).toBeLessThan(piPhaseRank("PRINTING"));
    expect(piPhaseRank("PRINTING")).toBeLessThan(piPhaseRank("COMPLETED"));
  });

  test("failed maps correctly", () => {
    const key = piMessageTypeToStatus(PiOutboundType.JOB_FAILED);
    expect(PI_PHASE_TO_DB_STATUS[key!]).toBe("FAILED");
  });
});
