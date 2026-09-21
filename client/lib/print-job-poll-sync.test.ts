import { describe, expect, test } from "bun:test";
import type { PrintJobDetail } from "./types";
import {
  runSerializedPrintJobPoll,
  shouldApplyPrintJobUpdate,
  sleepMs,
} from "./print-job-poll-sync";

function detail(
  overrides: Partial<PrintJobDetail> & { display_status: PrintJobDetail["display_status"] }
): PrintJobDetail {
  return {
    id: "8448db49-36d3-4fd3-994a-ba2f33778568",
    job_number: "QP-1",
    user_id: "u1",
    status: overrides.display_status === "COMPLETED" ? "COMPLETED" : "PRINTING",
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
    kiosk_id: "k1",
    saved_file_id: null,
    created_at: new Date().toISOString(),
    paid_at: new Date().toISOString(),
    claimed_at: null,
    display_label: "Printing",
    is_terminal: overrides.display_status === "COMPLETED",
    ...overrides,
  } as PrintJobDetail;
}

describe("shouldApplyPrintJobUpdate", () => {
  const printing = detail({ display_status: "PRINTING" });
  const completed = detail({ display_status: "COMPLETED" });

  test("rejects older sequence after newer applied", () => {
    expect(shouldApplyPrintJobUpdate(printing, printing, 1, 2)).toBe(false);
  });

  test("accepts newer sequence", () => {
    expect(shouldApplyPrintJobUpdate(printing, completed, 3, 2)).toBe(true);
  });

  test("rejects non-terminal overwrite after terminal", () => {
    expect(shouldApplyPrintJobUpdate(completed, printing, 5, 4)).toBe(false);
  });

  test("accepts terminal after non-terminal at higher seq", () => {
    expect(shouldApplyPrintJobUpdate(printing, completed, 2, 1)).toBe(true);
  });
});

describe("runSerializedPrintJobPoll", () => {
  test("stops after terminal response without further polls", async () => {
    let fetchCount = 0;
    const completed = detail({ display_status: "COMPLETED" });
    let current: PrintJobDetail | null = null;
    let lastSeq = 0;

    await runSerializedPrintJobPoll({
      generation: 1,
      getGeneration: () => 1,
      shouldStop: () => false,
      pollMs: 5,
      fetchJob: async () => {
        fetchCount += 1;
        return completed;
      },
      getCurrentJob: () => current,
      getLastAppliedSeq: () => lastSeq,
      setLastAppliedSeq: (seq) => {
        lastSeq = seq;
      },
      onJob: (job) => {
        current = job;
      },
      onPollError: () => {},
      onInitialError: () => {},
      clearPollError: () => {},
    });

    expect(fetchCount).toBe(1);
    expect(current?.display_status).toBe("COMPLETED");
  });

  test("never runs concurrent fetchJob calls", async () => {
    let active = 0;
    let maxActive = 0;
    let current: PrintJobDetail | null = null;
    let lastSeq = 0;
    let polls = 0;
    const printing = detail({ display_status: "PRINTING" });
    const completed = detail({ display_status: "COMPLETED" });

    await runSerializedPrintJobPoll({
      generation: 1,
      getGeneration: () => 1,
      shouldStop: () => polls >= 2,
      pollMs: 1,
      fetchJob: async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await sleepMs(15);
        active -= 1;
        polls += 1;
        return polls >= 2 ? completed : printing;
      },
      getCurrentJob: () => current,
      getLastAppliedSeq: () => lastSeq,
      setLastAppliedSeq: (seq) => {
        lastSeq = seq;
      },
      onJob: (job) => {
        current = job;
      },
      onPollError: () => {},
      onInitialError: () => {},
      clearPollError: () => {},
    });

    expect(maxActive).toBe(1);
  });

  test("stale PRINTING response cannot replace COMPLETED", async () => {
    let current: PrintJobDetail | null = null;
    let lastSeq = 0;
    const printing = detail({ display_status: "PRINTING" });
    const completed = detail({ display_status: "COMPLETED" });
    let call = 0;

    await runSerializedPrintJobPoll({
      generation: 1,
      getGeneration: () => 1,
      shouldStop: () => false,
      pollMs: 1,
      fetchJob: async () => {
        call += 1;
        if (call === 1) return printing;
        if (call === 2) return completed;
        await sleepMs(50);
        return printing;
      },
      getCurrentJob: () => current,
      getLastAppliedSeq: () => lastSeq,
      setLastAppliedSeq: (seq) => {
        lastSeq = seq;
      },
      onJob: (job) => {
        current = job;
      },
      onPollError: () => {},
      onInitialError: () => {},
      clearPollError: () => {},
    });

    expect(current?.display_status).toBe("COMPLETED");
  });

  test("retains job on poll error after initial success", async () => {
    let current: PrintJobDetail | null = null;
    let lastSeq = 0;
    let pollError: string | null = null;
    let call = 0;
    let errored = false;
    const printing = detail({ display_status: "PRINTING" });

    await runSerializedPrintJobPoll({
      generation: 1,
      getGeneration: () => 1,
      shouldStop: () => errored,
      pollMs: 1,
      fetchJob: async () => {
        call += 1;
        if (call === 1) return printing;
        throw new Error("network");
      },
      getCurrentJob: () => current,
      getLastAppliedSeq: () => lastSeq,
      setLastAppliedSeq: (seq) => {
        lastSeq = seq;
      },
      onJob: (job) => {
        current = job;
      },
      onPollError: (message) => {
        pollError = message;
        errored = true;
      },
      onInitialError: () => {},
      clearPollError: () => {
        pollError = null;
      },
    });

    expect(current?.display_status).toBe("PRINTING");
    expect(pollError).toBe("network");
  });

  test("ignores responses after generation bump", async () => {
    let current: PrintJobDetail | null = null;
    let lastSeq = 0;
    let generation = 1;
    const printing = detail({ display_status: "PRINTING" });

    const promise = runSerializedPrintJobPoll({
      generation: 1,
      getGeneration: () => generation,
      shouldStop: () => false,
      pollMs: 20,
      fetchJob: async () => {
        generation = 2;
        await sleepMs(30);
        return printing;
      },
      getCurrentJob: () => current,
      getLastAppliedSeq: () => lastSeq,
      setLastAppliedSeq: (seq) => {
        lastSeq = seq;
      },
      onJob: (job) => {
        current = job;
      },
      onPollError: () => {},
      onInitialError: () => {},
      clearPollError: () => {},
    });

    await promise;
    expect(current).toBeNull();
  });
});
