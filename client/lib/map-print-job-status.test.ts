import { describe, expect, test } from "bun:test";
import {
  mapPrintJobStatus,
  PRINT_JOB_STATUS_LABELS,
} from "./map-print-job-status";
import type { PrintJob } from "./types";

function job(overrides: Partial<PrintJob>): PrintJob {
  return {
    id: "1",
    job_number: "QP-1",
    user_id: "u1",
    status: "QUEUED",
    payment_status: "PAID",
    original_filename: "a.pdf",
    page_count: 1,
    copies: 1,
    page_range: "all",
    color_mode: "BW",
    paper_size: "A4",
    duplex: "SINGLE",
    pages_per_sheet: 1,
    order: "NORMAL",
    orientation: "AUTO",
    fit_to_page: true,
    physical_sheets: 1,
    amount_paise: 100,
    currency: "INR",
    save_file: false,
    file_retention_until: null,
    kiosk_id: null,
    saved_file_id: null,
    created_at: new Date().toISOString(),
    paid_at: new Date().toISOString(),
    claimed_at: null,
    ...overrides,
  };
}

describe("mapPrintJobStatus", () => {
  const cases = [
    { status: "QUEUED" as const, label: "In queue" },
    { status: "RECEIVED" as const, label: "Kiosk received" },
    { status: "DOWNLOADING" as const, label: "Downloading" },
    { status: "READY" as const, label: "File prepared" },
    { status: "PRINTING" as const, label: "Printing" },
    { status: "COMPLETED" as const, label: "Printed" },
    { status: "FAILED" as const, label: "Failed" },
  ];

  for (const { status, label } of cases) {
    test(`${status} → ${label}`, () => {
      const mapped = mapPrintJobStatus(
        job({
          display_status: status,
          display_label: label,
        })
      );
      expect(mapped.status).toBe(status);
      expect(mapped.label).toBe(label);
    });
  }

  test("falls back to canonical labels when display_label missing", () => {
    expect(mapPrintJobStatus(job({ display_status: "QUEUED" })).label).toBe(
      PRINT_JOB_STATUS_LABELS.QUEUED
    );
  });

  test("scan/history/status page agree on backend payload", () => {
    const apiJob = job({
      display_status: "RECEIVED",
      display_label: "Kiosk received",
      display_message: "The kiosk has received your print job.",
    });
    const scan = mapPrintJobStatus(apiJob);
    const history = mapPrintJobStatus(apiJob);
    const statusPage = mapPrintJobStatus(apiJob);
    expect(scan).toEqual(history);
    expect(history).toEqual(statusPage);
  });
});
