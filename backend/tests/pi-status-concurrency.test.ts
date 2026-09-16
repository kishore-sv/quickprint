import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { PrintJobEventType } from "../src/types/enums";
import { piPhaseRank } from "../src/services/print-job-lifecycle";

const KIOSK_ID = "550e8400-e29b-41d4-a716-446655440001";
const JOB_ID = "33a99399-2dd3-44b7-b988-789f8b36e86f";

type JobRow = {
  id: string;
  kioskId: string;
  status: string;
  piPhase: string | null;
  claimedAt: Date | null;
  printingStartedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  printerJobId: string | null;
  failureReason: string | null;
  userErrorCode: string | null;
  lastPiEventAt: Date | null;
};

function makeJob(overrides: Partial<JobRow> = {}): JobRow {
  return {
    id: JOB_ID,
    kioskId: KIOSK_ID,
    status: "DOWNLOADING",
    piPhase: "READY",
    claimedAt: new Date(),
    printingStartedAt: null,
    completedAt: null,
    failedAt: null,
    printerJobId: null,
    failureReason: null,
    userErrorCode: null,
    lastPiEventAt: new Date(),
    ...overrides,
  };
}

function createMockDb() {
  let job = makeJob();
  const events: { eventType: string; printJobId: string }[] = [];
  let selectDelayMs = 0;

  function applyUpdateGuard(patch: Partial<JobRow>): JobRow[] {
    const piStatusKey = patch.piPhase ?? "";
    const incomingRank = piPhaseRank(piStatusKey);
    const terminal = ["COMPLETED", "FAILED", "CANCELLED", "EXPIRED"];
    if (piStatusKey !== "FAILED" && terminal.includes(job.status)) {
      return [];
    }
    if (
      piStatusKey !== "FAILED" &&
      job.piPhase &&
      piPhaseRank(job.piPhase) > incomingRank
    ) {
      return [];
    }
    job = { ...job, ...patch };
    return [{ ...job }];
  }

  return {
    job: () => job,
    events: () => events,
    setSelectDelayMs: (ms: number) => {
      selectDelayMs = ms;
    },
    reset: (row?: JobRow) => {
      job = row ?? makeJob();
      events.length = 0;
      selectDelayMs = 0;
    },
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            if (selectDelayMs > 0) {
              await new Promise((r) => setTimeout(r, selectDelayMs));
            }
            return [{ ...job }];
          },
        }),
      }),
    }),
    update: () => ({
      set: (patch: Partial<JobRow>) => ({
        where: () => ({
          returning: async () => applyUpdateGuard(patch),
        }),
      }),
    }),
    insert: () => ({
      values: async (row: { eventType: string; printJobId: string }) => {
        events.push(row);
      },
    }),
  };
}

const mockDb = createMockDb();

mock.module("../src/db", () => ({
  db: mockDb,
}));

mock.module("../src/services/kiosk-dispatch.service", () => ({
  markJobDispatchComplete: async () => {},
}));

mock.module("../src/services/print-job-cleanup.service", () => ({
  cleanupJobSourceFile: async () => {},
}));

mock.module("../src/services/kiosk-display.service", () => ({
  broadcastKioskDisplayUpdate: async () => {},
}));

import {
  applyPiJobUpdate,
  resetPiJobUpdateLocks,
} from "../src/services/pi-status.service";

describe("applyPiJobUpdate concurrency", () => {
  beforeEach(() => {
    resetPiJobUpdateLocks();
    mockDb.reset();
  });

  afterEach(() => {
    resetPiJobUpdateLocks();
  });

  test("concurrent SUBMITTED and COMPLETED leaves job COMPLETED", async () => {
    mockDb.setSelectDelayMs(15);
    await Promise.all([
      applyPiJobUpdate(KIOSK_ID, JOB_ID, "SUBMITTED", { cups_job_id: "cups-8" }),
      applyPiJobUpdate(KIOSK_ID, JOB_ID, "COMPLETED", { cups_job_id: "cups-8" }),
    ]);

    const final = mockDb.job();
    expect(final.status).toBe("COMPLETED");
    expect(final.piPhase).toBe("COMPLETED");
    expect(final.completedAt).not.toBeNull();
    expect(mockDb.events().some((e) => e.eventType === PrintJobEventType.PRINT_COMPLETED)).toBe(
      true
    );
  });

  test("COMPLETED is not overwritten when SUBMITTED arrives after", async () => {
    await applyPiJobUpdate(KIOSK_ID, JOB_ID, "COMPLETED");
    await applyPiJobUpdate(KIOSK_ID, JOB_ID, "SUBMITTED");

    const final = mockDb.job();
    expect(final.status).toBe("COMPLETED");
    expect(final.piPhase).toBe("COMPLETED");
  });
});
