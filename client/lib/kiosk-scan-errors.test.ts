import { describe, expect, test } from "bun:test";
import { ApiError } from "@/lib/api";
import { kioskScanErrorMessage } from "@/lib/kiosk-scan-errors";

describe("kioskScanErrorMessage", () => {
  test("maps kiosk not found to a friendly message", () => {
    const message = kioskScanErrorMessage(new ApiError("Kiosk not found", 404, "NOT_FOUND"));
    expect(message.title).toBe("Kiosk not found");
    expect(message.description).toContain("QR code");
  });

  test("falls back for unknown errors", () => {
    const message = kioskScanErrorMessage(new Error("Request failed"));
    expect(message.title).toBe("Couldn't connect to kiosk");
    expect(message.description).toContain("printer");
  });
});
