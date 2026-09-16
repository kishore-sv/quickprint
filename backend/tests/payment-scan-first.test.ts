import { beforeEach, describe, expect, mock, test } from "bun:test";

const bindJobToUserKiosk = mock(async () => ({
  id: "job-1",
  kioskId: "kiosk-1",
  userId: "user-1",
}));
const enqueueDispatchForKiosk = mock(async () => {});

mock.module("../src/services/kiosk-bind.service", () => ({
  bindJobToUserKiosk,
  getActiveKioskSessionForUser: async () => null,
  assertKioskSessionForUser: async () => {
    throw new Error("no session");
  },
  releaseReadyJobsToKiosk: async () => [],
}));

mock.module("../src/services/kiosk-dispatch.service", () => ({
  enqueueDispatchForKiosk,
  onAgentConnected: async () => {},
  requeueUnacknowledgedJobsForKiosk: async () => 0,
  clearInFlightKiosk: () => {},
  markJobDispatchComplete: async () => {},
}));

const returnedJob = {
  id: "job-1",
  userId: "user-1",
  kioskId: null,
  paymentStatus: "PAID",
  status: "QUEUED",
};

function makeTx() {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            const stack = new Error().stack ?? "";
            if (stack.includes("payments")) {
              return [
                {
                  id: "pay-row-1",
                  printJobId: "job-1",
                  status: "CREATED",
                  idempotencyKey: null,
                },
              ];
            }
            return [returnedJob];
          },
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => [returnedJob],
        }),
      }),
    }),
    insert: () => ({
      values: async () => {},
    }),
  };
}

mock.module("../src/db", () => ({
  db: {
    transaction: async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) =>
      fn(makeTx()),
  },
  pool: { end: async () => {} },
}));

import { markPaymentSuccess } from "../src/services/payment.service";

describe("scan-first payment", () => {
  beforeEach(() => {
    bindJobToUserKiosk.mockClear();
    enqueueDispatchForKiosk.mockClear();
  });

  test("markPaymentSuccess does not bind kiosk or dispatch", async () => {
    const job = await markPaymentSuccess("pay-row-1", "razorpay-pay-1");
    expect(job.kioskId).toBeNull();
    expect(bindJobToUserKiosk).not.toHaveBeenCalled();
    expect(enqueueDispatchForKiosk).not.toHaveBeenCalled();
  });
});
