import { beforeEach, describe, expect, mock, test } from "bun:test";

const enqueueDispatchForKiosk = mock(async () => {});
const broadcastKioskDisplayUpdate = mock(async () => {});
const addEvent = mock(async () => {});

let jobRow = {
  id: "job-1",
  userId: "user-1",
  kioskId: "kiosk-1",
  status: "FAILED",
  paymentStatus: "PAID",
  amountPaise: 400,
  failedAt: new Date(),
  failureReason: "Print failed",
  userErrorCode: "PRINT_FAILED",
  dispatchedAt: new Date(),
  piPhase: "FAILED",
  claimedAt: new Date(),
  printingStartedAt: new Date(),
  printerJobId: "cups-1",
  lastPiEventAt: new Date(),
};

mock.module("../src/services/kiosk-dispatch.service", () => ({
  enqueueDispatchForKiosk,
}));

mock.module("../src/services/kiosk-display.service", () => ({
  broadcastKioskDisplayUpdate,
}));

mock.module("../src/services/print-job.service", () => ({
  getOwnedJob: async (_jobId: string, userId: string) => {
    if (userId !== "user-1") throw new Error("not found");
    return { ...jobRow };
  },
  addEvent,
}));

const updatedRow = {
  ...jobRow,
  status: "QUEUED",
  failedAt: null,
  failureReason: null,
  userErrorCode: null,
  dispatchedAt: null,
  piPhase: null,
  claimedAt: null,
  printingStartedAt: null,
  printerJobId: null,
  lastPiEventAt: null,
};

mock.module("../src/db", () => ({
  db: {
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => {
            if (jobRow.status !== "FAILED" || jobRow.paymentStatus !== "PAID" || !jobRow.kioskId) {
              return [];
            }
            jobRow = { ...updatedRow };
            return [jobRow];
          },
        }),
      }),
    }),
  },
  pool: { end: async () => {} },
}));

import { retryFailedPrintJob } from "../src/services/retry-print-job.service";
import { PrintJobError } from "../src/utils/errors";

describe("retryFailedPrintJob", () => {
  beforeEach(() => {
    jobRow = {
      id: "job-1",
      userId: "user-1",
      kioskId: "kiosk-1",
      status: "FAILED",
      paymentStatus: "PAID",
      amountPaise: 400,
      failedAt: new Date(),
      failureReason: "Print failed",
      userErrorCode: "PRINT_FAILED",
      dispatchedAt: new Date(),
      piPhase: "FAILED",
      claimedAt: new Date(),
      printingStartedAt: new Date(),
      printerJobId: "cups-1",
      lastPiEventAt: new Date(),
    };
    enqueueDispatchForKiosk.mockClear();
    broadcastKioskDisplayUpdate.mockClear();
    addEvent.mockClear();
  });

  test("FAILED paid job transitions to QUEUED and clears failure fields", async () => {
    const result = await retryFailedPrintJob("user-1", "job-1");
    expect(result.status).toBe("QUEUED");
    expect(result.failedAt).toBeNull();
    expect(result.failureReason).toBeNull();
    expect(result.userErrorCode).toBeNull();
    expect(result.dispatchedAt).toBeNull();
    expect(result.piPhase).toBeNull();
    expect(result.amountPaise).toBe(400);
    expect(enqueueDispatchForKiosk).toHaveBeenCalledWith("kiosk-1");
    expect(broadcastKioskDisplayUpdate).toHaveBeenCalled();
    expect(addEvent).toHaveBeenCalled();
  });

  test("rejects non-failed job", async () => {
    jobRow = { ...jobRow, status: "COMPLETED" };
    await expect(retryFailedPrintJob("user-1", "job-1")).rejects.toBeInstanceOf(PrintJobError);
    expect(enqueueDispatchForKiosk).not.toHaveBeenCalled();
  });

  test("rejects refunded job", async () => {
    jobRow = { ...jobRow, paymentStatus: "REFUNDED" };
    await expect(retryFailedPrintJob("user-1", "job-1")).rejects.toBeInstanceOf(PrintJobError);
    expect(enqueueDispatchForKiosk).not.toHaveBeenCalled();
  });

  test("rejects job without kiosk", async () => {
    jobRow = { ...jobRow, kioskId: null };
    await expect(retryFailedPrintJob("user-1", "job-1")).rejects.toBeInstanceOf(PrintJobError);
    expect(enqueueDispatchForKiosk).not.toHaveBeenCalled();
  });
});
