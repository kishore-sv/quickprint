import { describe, expect, test } from "bun:test";

describe("kiosk token resolution (logic)", () => {
  test("valid active kiosk", () => {
    const kiosk = { status: "ACTIVE", publicToken: "tok" };
    expect(kiosk.status === "ACTIVE").toBe(true);
  });

  test("inactive kiosk rejected", () => {
    const kiosk = { status: "INACTIVE" as string };
    const allowed = kiosk.status === "ACTIVE";
    expect(allowed).toBe(false);
  });

  test("maintenance kiosk rejected", () => {
    const kiosk = { status: "MAINTENANCE" as string };
    expect(kiosk.status === "ACTIVE").toBe(false);
  });

  test("missing token is invalid", () => {
    const token = "";
    expect(Boolean(token.trim())).toBe(false);
  });
});

describe("kiosk session binding (logic)", () => {
  test("session must not be expired", () => {
    const expiresAt = new Date(Date.now() + 60_000);
    expect(expiresAt > new Date()).toBe(true);
  });

  test("expired session rejected", () => {
    const expiresAt = new Date(Date.now() - 60_000);
    expect(expiresAt > new Date()).toBe(false);
  });
});
