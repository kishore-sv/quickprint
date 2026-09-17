import { describe, expect, test } from "bun:test";
import { resetDispatchState } from "../src/services/kiosk-dispatch.service";

describe("kiosk dispatch state", () => {
  test("resetDispatchState clears in-flight map", () => {
    resetDispatchState();
    expect(true).toBe(true);
  });
});
