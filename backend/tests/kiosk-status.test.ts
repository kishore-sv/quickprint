import { describe, expect, test } from "bun:test";
import { getKioskAgentRegistry, resetKioskAgentRegistry } from "../src/ws/kiosk-agent.registry";

describe("kiosk service status (logic)", () => {
  test("offline when no socket", () => {
    resetKioskAgentRegistry();
    expect(getKioskAgentRegistry().isOnline("missing-kiosk")).toBe(false);
  });
});
