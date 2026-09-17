import { describe, expect, test } from "bun:test";
import { stripSslQueryParams } from "../src/db/pool-config";

describe("stripSslQueryParams", () => {
  test("removes sslmode from RDS URLs", () => {
    const url =
      "postgresql://user:pass@host.rds.amazonaws.com:5432/quickprint?sslmode=require";
    expect(stripSslQueryParams(url)).toBe(
      "postgresql://user:pass@host.rds.amazonaws.com:5432/quickprint"
    );
  });

  test("removes sslmode and ssl params together", () => {
    const url =
      "postgresql://user:pass@host.rds.amazonaws.com:5432/quickprint?sslmode=require&ssl=true";
    expect(stripSslQueryParams(url)).toBe(
      "postgresql://user:pass@host.rds.amazonaws.com:5432/quickprint"
    );
  });

  test("leaves URLs without ssl params unchanged", () => {
    const url = "postgresql://user:pass@localhost:5432/quickprint";
    expect(stripSslQueryParams(url)).toBe(url);
  });
});
