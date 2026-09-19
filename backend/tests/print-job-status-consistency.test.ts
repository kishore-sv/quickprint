import { describe, expect, test } from "bun:test";
import {
  displayLabel,
  resolveDisplayStatus,
} from "../src/services/print-job-display.service";
import { LIFECYCLE_STATUS_LABELS } from "../src/services/print-job-lifecycle";
import { serializePrintJob } from "../src/utils/serializers";

const now = new Date();

function jobRow(overrides: Record<string, unknown>) {
  return {
    id: "job-1",
    jobNumber: "QP-TEST-001",
    userId: "user-1",
    kioskId: "kiosk-1",
    savedFileId: null,
    status: "QUEUED",
    paymentStatus: "PAID",
    originalFilename: "test.pdf",
    pageCount: 1,
    copies: 1,
    pageRange: "all",
    colorMode: "BW",
    paperSize: "A4",
    duplex: "SINGLE",
    pagesPerSheet: 1,
    order: "NORMAL",
    orientation: "AUTO",
    fitToPage: true,
    physicalSheets: 1,
    amountPaise: 600,
    currency: "INR",
    saveFile: false,
    fileRetentionUntil: null,
    createdAt: now,
    paidAt: now,
    claimedAt: null,
    dispatchedAt: null,
    piPhase: null,
    userErrorCode: null,
    completedAt: null,
    failedAt: null,
    lastPiEventAt: null,
    ...overrides,
  };
}

/** Simulates mapPrintJobStatus on the client — must match backend serializer output. */
function clientLabelFromApi(job: ReturnType<typeof serializePrintJob>) {
  const status = job.display_status ?? "QUEUED";
  return job.display_label ?? LIFECYCLE_STATUS_LABELS[status];
}

describe("print job status consistency (API ↔ all pages)", () => {
  const scenarios = [
    { name: "queued", overrides: { status: "QUEUED", piPhase: null }, expected: "QUEUED" },
    {
      name: "queued dispatched awaiting pi",
      overrides: { status: "QUEUED", piPhase: null, dispatchedAt: now },
      expected: "QUEUED",
    },
    {
      name: "received",
      overrides: { status: "CLAIMED", piPhase: "RECEIVED", dispatchedAt: now },
      expected: "RECEIVED",
    },
    {
      name: "downloading",
      overrides: { status: "DOWNLOADING", piPhase: "DOWNLOADING", dispatchedAt: now },
      expected: "DOWNLOADING",
    },
    {
      name: "ready",
      overrides: { status: "DOWNLOADING", piPhase: "READY", dispatchedAt: now },
      expected: "READY",
    },
    {
      name: "printing",
      overrides: { status: "PRINTING", piPhase: "PRINTING", dispatchedAt: now },
      expected: "PRINTING",
    },
    {
      name: "completed",
      overrides: { status: "COMPLETED", piPhase: "COMPLETED", dispatchedAt: now },
      expected: "COMPLETED",
    },
    {
      name: "failed",
      overrides: {
        status: "FAILED",
        piPhase: "FAILED",
        dispatchedAt: now,
        userErrorCode: "PRINT_FAILED",
      },
      expected: "FAILED",
    },
  ] as const;

  for (const scenario of scenarios) {
    test(`${scenario.name}: scan, history, and status page render the same label`, () => {
      const row = jobRow(scenario.overrides);
      const api = serializePrintJob(row);
      const expectedLabel = displayLabel(scenario.expected);

      expect(resolveDisplayStatus(row)).toBe(scenario.expected);
      expect(api.display_status).toBe(scenario.expected);
      expect(api.display_label).toBe(expectedLabel);
      expect(clientLabelFromApi(api)).toBe(expectedLabel);
    });
  }

  test("completed is never shown as queued", () => {
    const row = jobRow({ status: "COMPLETED", piPhase: "COMPLETED" });
    expect(resolveDisplayStatus(row)).not.toBe("QUEUED");
    expect(serializePrintJob(row).display_status).toBe("COMPLETED");
  });

  test("cancelled refunded job shows cancelled, not awaiting payment", () => {
    const row = jobRow({ status: "CANCELLED", paymentStatus: "REFUNDED" });
    expect(resolveDisplayStatus(row)).toBe("CANCELLED");
    const api = serializePrintJob(row);
    expect(api.display_status).toBe("CANCELLED");
    expect(api.display_label).toBe("Cancelled");
    expect(clientLabelFromApi(api)).toBe("Cancelled");
  });
});
