import { describe, expect, test } from "bun:test";
import {
  buildKioskDisplayUrl,
  isAllowedDisplayRedirectUrl,
} from "../src/utils/display-redirect-url";

describe("display redirect url validation", () => {
  test("buildKioskDisplayUrl returns canonical path without secrets", () => {
    const url = buildKioskDisplayUrl("KIOSK-001");
    expect(url).toBe(buildKioskDisplayUrl("KIOSK-001"));
    expect(url).toMatch(/\/kiosk\/KIOSK-001$/);
    expect(url).not.toContain("?");
    expect(url).not.toContain("token");
  });

  test("allows frontend kiosk path", () => {
    expect(isAllowedDisplayRedirectUrl("http://localhost:3000/kiosk/KIOSK-001")).toBe(true);
    expect(isAllowedDisplayRedirectUrl(buildKioskDisplayUrl("KIOSK-001"))).toBe(true);
  });

  test("rejects token in query string", () => {
    expect(
      isAllowedDisplayRedirectUrl("http://localhost:3000/kiosk/KIOSK-001?displayToken=abc")
    ).toBe(false);
  });

  test("rejects unknown origin", () => {
    expect(isAllowedDisplayRedirectUrl("http://evil.example/kiosk/KIOSK-001")).toBe(false);
  });
});
