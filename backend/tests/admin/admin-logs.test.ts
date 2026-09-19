import { describe, expect, test } from "bun:test";

const SENSITIVE_KEYS = ["password", "token", "secret", "authorization"];

function sanitizeMetadata(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "object" && !Array.isArray(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.some((s) => lower.includes(s))) {
        out[key] = "[redacted]";
      } else {
        out[key] = sanitizeMetadata(val);
      }
    }
    return out;
  }
  return value;
}

describe("operational log sanitization", () => {
  test("redacts sensitive metadata keys", () => {
    const result = sanitizeMetadata({
      agent_token: "secret-value",
      kiosk_code: "KIOSK-001",
      password: "x",
    }) as Record<string, unknown>;
    expect(result.agent_token).toBe("[redacted]");
    expect(result.password).toBe("[redacted]");
    expect(result.kiosk_code).toBe("KIOSK-001");
  });
});
