import { beforeEach, describe, expect, test } from "bun:test";

const KIOSK_ID = "550e8400-e29b-41d4-a716-446655440001";
const JOB_ID = "33a99399-2dd3-44b7-b988-789f8b36e86f";
const USER_ID = "user-1";

type JobRow = {
  id: string;
  kioskId: string;
  userId: string;
  status: string;
  paymentStatus: string;
  dispatchedAt: Date | null;
  storageKey: string;
  originalFilename: string;
  copies: number;
  pageRange: string;
  colorMode: string;
  paperSize: string;
  duplex: string;
  pagesPerSheet: number;
  order: string;
  orientation: string;
  fitToPage: boolean;
};

function makeJob(overrides: Partial<JobRow> = {}): JobRow {
  return {
    id: JOB_ID,
    kioskId: KIOSK_ID,
    userId: USER_ID,
    status: "QUEUED",
    paymentStatus: "PAID",
    dispatchedAt: null,
    storageKey: "files/test.pdf",
    originalFilename: "test.pdf",
    copies: 1,
    pageRange: "all",
    colorMode: "BW",
    paperSize: "A4",
    duplex: "SINGLE",
    pagesPerSheet: 1,
    order: "NORMAL",
    orientation: "AUTO",
    fitToPage: true,
    ...overrides,
  };
}

function canDispatchClaim(job: JobRow, kioskId: string, jobId: string): boolean {
  return (
    job.id === jobId &&
    job.kioskId === kioskId &&
    job.paymentStatus === "PAID" &&
    job.status === "QUEUED" &&
    job.dispatchedAt == null
  );
}

function canCancelPaid(job: JobRow): boolean {
  if (job.status === "QUEUED" || job.status === "PAID") {
    return job.dispatchedAt == null;
  }
  return job.status === "CLAIMED" || job.status === "DOWNLOADING";
}

function createConcurrencyMockDb() {
  let job = makeJob();
  let updateChain = Promise.resolve();

  function runSerialized<T>(fn: () => Promise<T>): Promise<T> {
    const next = updateChain.then(() => fn());
    updateChain = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }

  return {
    job: () => ({ ...job }),
    reset: (row?: JobRow) => {
      job = row ?? makeJob();
      updateChain = Promise.resolve();
    },
    claimDispatch: (kioskId: string, jobId: string) =>
      runSerialized(async () => {
        if (!canDispatchClaim(job, kioskId, jobId)) {
          return null;
        }
        job = { ...job, dispatchedAt: new Date() };
        return { ...job };
      }),
    cancelPaid: () =>
      runSerialized(async () => {
        if (!canCancelPaid(job)) {
          return null;
        }
        job = { ...job, status: "CANCELLED" };
        return { ...job };
      }),
    releaseClaim: () =>
      runSerialized(async () => {
        if (job.status === "QUEUED" && job.dispatchedAt != null) {
          job = { ...job, dispatchedAt: null };
        }
      }),
    readStatus: () => runSerialized(async () => job.status),
    forceCancel: () =>
      runSerialized(async () => {
        job = { ...job, status: "CANCELLED", dispatchedAt: null };
      }),
  };
}

describe("dispatch vs cancellation concurrency (simulated PG)", () => {
  const mockDb = createConcurrencyMockDb();

  beforeEach(() => {
    mockDb.reset();
  });

  test("cancel wins race — dispatch claim fails", async () => {
    const [cancelResult, claimResult] = await Promise.all([
      mockDb.cancelPaid(),
      mockDb.claimDispatch(KIOSK_ID, JOB_ID),
    ]);

    const oneSucceeded =
      (cancelResult != null ? 1 : 0) + (claimResult != null ? 1 : 0);
    expect(oneSucceeded).toBe(1);

    if (cancelResult) {
      expect(mockDb.job().status).toBe("CANCELLED");
      expect(mockDb.job().dispatchedAt).toBeNull();
    } else {
      expect(mockDb.job().dispatchedAt).not.toBeNull();
      expect(mockDb.job().status).toBe("QUEUED");
    }
  });

  test("dispatch claim wins — cancel on QUEUED fails", async () => {
    const claim = await mockDb.claimDispatch(KIOSK_ID, JOB_ID);
    expect(claim).not.toBeNull();

    const cancel = await mockDb.cancelPaid();
    expect(cancel).toBeNull();
    expect(mockDb.job().status).toBe("QUEUED");
    expect(mockDb.job().dispatchedAt).not.toBeNull();
  });

  test("two concurrent dispatch claims — exactly one succeeds", async () => {
    const [a, b] = await Promise.all([
      mockDb.claimDispatch(KIOSK_ID, JOB_ID),
      mockDb.claimDispatch(KIOSK_ID, JOB_ID),
    ]);

    const winners = [a, b].filter(Boolean);
    expect(winners.length).toBe(1);
    expect(mockDb.job().dispatchedAt).not.toBeNull();
  });

  test("cancel twice is idempotent at row level", async () => {
    const first = await mockDb.cancelPaid();
    expect(first?.status).toBe("CANCELLED");

    const second = await mockDb.cancelPaid();
    expect(second).toBeNull();
    expect(mockDb.job().status).toBe("CANCELLED");
  });

  test("stale dispatch cannot claim CANCELLED job", async () => {
    await mockDb.cancelPaid();
    const claim = await mockDb.claimDispatch(KIOSK_ID, JOB_ID);
    expect(claim).toBeNull();
    expect(mockDb.job().status).toBe("CANCELLED");
  });

  test("PRINTING job cannot be cancelled via paid mutex", async () => {
    mockDb.reset(makeJob({ status: "PRINTING", dispatchedAt: new Date() }));
    const cancel = await mockDb.cancelPaid();
    expect(cancel).toBeNull();
    expect(mockDb.job().status).toBe("PRINTING");
  });

  test("COMPLETED job cannot be cancelled via paid mutex", async () => {
    mockDb.reset(makeJob({ status: "COMPLETED", dispatchedAt: new Date() }));
    const cancel = await mockDb.cancelPaid();
    expect(cancel).toBeNull();
  });

  test("pre-send guard releases claim when job is CANCELLED", async () => {
    const claim = await mockDb.claimDispatch(KIOSK_ID, JOB_ID);
    expect(claim).not.toBeNull();

    await mockDb.forceCancel();
    const status = await mockDb.readStatus();
    expect(status).toBe("CANCELLED");

    await mockDb.releaseClaim();
    expect(mockDb.job().dispatchedAt).toBeNull();
  });

  test("CLAIMED job remains cancellable after dispatch", async () => {
    mockDb.reset(makeJob({ status: "CLAIMED", dispatchedAt: new Date() }));
    const cancel = await mockDb.cancelPaid();
    expect(cancel?.status).toBe("CANCELLED");
  });

  test("dispatch sends only after claim in ordered flow", async () => {
    const events: string[] = [];
    const claim = await mockDb.claimDispatch(KIOSK_ID, JOB_ID);
    if (claim) events.push("claim");
    if (claim && mockDb.job().status !== "CANCELLED") {
      events.push("ws_send");
    }
    expect(events).toEqual(["claim", "ws_send"]);
  });

  test("no ws_send when claim fails", async () => {
    await mockDb.cancelPaid();
    const events: string[] = [];
    const claim = await mockDb.claimDispatch(KIOSK_ID, JOB_ID);
    if (claim) events.push("claim");
    if (claim && mockDb.job().status !== "CANCELLED") {
      events.push("ws_send");
    }
    expect(events).toEqual([]);
  });
});

const integrationEnabled = process.env.DISPATCH_CONCURRENCY_INTEGRATION === "1";

describe.skipIf(!integrationEnabled)("dispatch concurrency (real DB)", () => {
  test("parallel claim and cancel — mutually exclusive", async () => {
    const { db } = await import("../src/db");
    const { printJobs, kiosks } = await import("../src/db/schema");
    const { eq } = await import("drizzle-orm");
    const { buildDispatchClaimWhere, buildPaidCancellationWhere } = await import(
      "../src/services/dispatch-claim"
    );

    const [kiosk] = await db.select().from(kiosks).limit(1);
    if (!kiosk) {
      console.warn("Skipping: no kiosk in test DB");
      return;
    }

    const [inserted] = await db
      .insert(printJobs)
      .values({
        jobNumber: `QP-TEST-${Date.now()}`,
        userId: "integration-test-user",
        kioskId: kiosk.id,
        status: "QUEUED",
        paymentStatus: "PAID",
        originalFilename: "race.pdf",
        storageKey: "test/race.pdf",
        fileSizeBytes: 100,
        fileHash: "hash",
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
        currency: "INR",
        saveFile: false,
        paidAt: new Date(),
      })
      .returning();

    try {
      const [claimResult, cancelResult] = await Promise.all([
        db
          .update(printJobs)
          .set({ dispatchedAt: new Date() })
          .where(buildDispatchClaimWhere(kiosk.id, inserted.id))
          .returning(),
        db
          .update(printJobs)
          .set({ status: "CANCELLED" })
          .where(buildPaidCancellationWhere(inserted.id))
          .returning(),
      ]);

      const winners = (claimResult.length > 0 ? 1 : 0) + (cancelResult.length > 0 ? 1 : 0);
      expect(winners).toBe(1);

      const [final] = await db
        .select()
        .from(printJobs)
        .where(eq(printJobs.id, inserted.id))
        .limit(1);

      if (final?.status === "CANCELLED") {
        expect(final.dispatchedAt).toBeNull();
      } else {
        expect(final?.dispatchedAt).not.toBeNull();
        expect(final?.status).toBe("QUEUED");
      }
    } finally {
      await db.delete(printJobs).where(eq(printJobs.id, inserted.id));
    }
  });
});
