import { describe, expect, test } from "bun:test";
import { parseDatabaseUrl, stripSslQueryParams } from "../src/db/pool-config";

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

describe("parseDatabaseUrl", () => {
  test("parses RDS-style URLs", () => {
    expect(
      parseDatabaseUrl(
        "postgresql://quickprint_admin:secret@quickprint-prod-db.cpwkog2a8tq4.ap-south-1.rds.amazonaws.com:5432/quickprint"
      )
    ).toEqual({
      host: "quickprint-prod-db.cpwkog2a8tq4.ap-south-1.rds.amazonaws.com",
      port: 5432,
      user: "quickprint_admin",
      password: "secret",
      database: "quickprint",
    });
  });
});
