import { describe, expect, test } from "bun:test";
import {
  buildJobAssignedMessage,
  pageRangeForPiAgent,
  parseAgentAuthHeader,
  piMessageTypeToStatus,
  PiInboundType,
  PiOutboundType,
} from "../src/ws/kiosk-agent.protocol";
import {
  generateAgentToken,
  hashAgentToken,
  isKioskUuid,
  verifyAgentToken,
} from "../src/services/kiosk-agent-auth.service";
import { buildKioskScanUrl } from "../src/scripts/generate-kiosk-qr";

describe("kiosk agent protocol", () => {
  test("parseAgentAuthHeader accepts Bearer kioskId:secret", () => {
    const parsed = parseAgentAuthHeader("Bearer abc-123:sekret");
    expect(parsed).toEqual({ agentId: "abc-123", secret: "sekret" });
  });

  test("parseAgentAuthHeader rejects malformed header", () => {
    expect(parseAgentAuthHeader(undefined)).toBeNull();
    expect(parseAgentAuthHeader("Bearer nocolon")).toBeNull();
  });

  test("pageRangeForPiAgent maps all to null", () => {
    expect(pageRangeForPiAgent("all")).toBeNull();
    expect(pageRangeForPiAgent("ALL")).toBeNull();
    expect(pageRangeForPiAgent(" all ")).toBeNull();
  });

  test("pageRangeForPiAgent preserves explicit ranges", () => {
    expect(pageRangeForPiAgent("1-3")).toBe("1-3");
    expect(pageRangeForPiAgent("1,3")).toBe("1,3");
    expect(pageRangeForPiAgent("1-3,5")).toBe("1-3,5");
  });

  test("buildJobAssignedMessage uses job.assigned type", () => {
    const raw = buildJobAssignedMessage({
      job_id: "job-1",
      file_url: "https://example.com/file.pdf",
      filename: "file.pdf",
      print_settings: { copies: 1, page_range: "all" },
    });
    const parsed = JSON.parse(raw) as { type: string; job_id: string };
    expect(parsed.type).toBe(PiInboundType.JOB_ASSIGNED);
    expect(parsed.job_id).toBe("job-1");
  });

  test("piMessageTypeToStatus maps Pi outbound types", () => {
    expect(piMessageTypeToStatus(PiOutboundType.JOB_PRINTING)).toBe("PRINTING");
    expect(piMessageTypeToStatus(PiOutboundType.JOB_COMPLETED)).toBe("COMPLETED");
  });
});

describe("kiosk agent id resolution", () => {
  test("kiosk code is not treated as uuid", () => {
    expect(isKioskUuid("KIOSK-001")).toBe(false);
  });

  test("uuid format is recognized", () => {
    expect(isKioskUuid("cd0286f4-0bcb-4604-9ad4-a4714d103290")).toBe(true);
  });
});

describe("kiosk agent token", () => {
  test("hash and verify agent token", () => {
    const plain = generateAgentToken();
    const hash = hashAgentToken(plain);
    expect(verifyAgentToken(plain, hash)).toBe(true);
    expect(verifyAgentToken("wrong", hash)).toBe(false);
  });
});

describe("kiosk QR URL", () => {
  test("buildKioskScanUrl uses path token", () => {
    const url = buildKioskScanUrl("tok123", "https://quickprint.fun");
    expect(url).toBe("https://quickprint.fun/scan/tok123");
  });

  test("buildKioskScanUrl encodes token", () => {
    const url = buildKioskScanUrl("a/b", "http://localhost:3000");
    expect(url).toBe("http://localhost:3000/scan/a%2Fb");
  });
});
