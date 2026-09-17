import { describe, expect, test } from "bun:test";
import { normalizeDatabaseUrl } from "../src/config/env";

describe("normalizeDatabaseUrl", () => {
  test("upgrades sslmode to verify-full for Neon hosts", () => {
    const url =
      "postgresql://user:pass@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";
    expect(normalizeDatabaseUrl(url)).toBe(
      "postgresql://user:pass@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=verify-full"
    );
  });

  test("keeps sslmode=require for RDS hosts", () => {
    const url =
      "postgresql://user:pass@quickprint.xxxxx.ap-south-1.rds.amazonaws.com:5432/quickprint?sslmode=require";
    expect(normalizeDatabaseUrl(url)).toBe(url);
  });

  test("strips channel_binding on any host", () => {
    const url =
      "postgresql://user:pass@quickprint.xxxxx.ap-south-1.rds.amazonaws.com:5432/quickprint?sslmode=require&channel_binding=require";
    expect(normalizeDatabaseUrl(url)).toBe(
      "postgresql://user:pass@quickprint.xxxxx.ap-south-1.rds.amazonaws.com:5432/quickprint?sslmode=require"
    );
  });

  test("leaves localhost URLs without sslmode unchanged", () => {
    const url = "postgresql://user:pass@localhost:5432/quickprint";
    expect(normalizeDatabaseUrl(url)).toBe(url);
  });

  test("returns invalid URLs as-is", () => {
    const url = "not-a-valid-url";
    expect(normalizeDatabaseUrl(url)).toBe(url);
  });
});
