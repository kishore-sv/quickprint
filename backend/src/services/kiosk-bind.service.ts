import { randomUUID } from "crypto";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "../db";
import { kioskSessions, kiosks, printJobs } from "../db/schema";
import { PrintJobEventType } from "../types/enums";
import { NotFoundError, PrintJobError } from "../utils/errors";
import { enqueueDispatchForKiosk } from "./kiosk-dispatch.service";
import { addEvent } from "./print-job.service";

export async function getActiveKioskSessionForUser(userId: string) {
  const now = new Date();
  const [session] = await db
    .select({
      sessionId: kioskSessions.id,
      kioskId: kioskSessions.kioskId,
      expiresAt: kioskSessions.expiresAt,
    })
    .from(kioskSessions)
    .where(and(eq(kioskSessions.userId, userId), gt(kioskSessions.expiresAt, now)))
    .orderBy(desc(kioskSessions.expiresAt))
    .limit(1);

  if (!session) return null;

  const [kiosk] = await db
    .select()
    .from(kiosks)
    .where(eq(kiosks.id, session.kioskId))
    .limit(1);
  if (!kiosk || kiosk.status !== "ACTIVE") return null;

  return { session, kiosk };
}

export async function assertKioskSessionForUser(userId: string) {
  const ctx = await getActiveKioskSessionForUser(userId);
  if (!ctx) {
    throw new PrintJobError(
      "No active kiosk session. Scan the kiosk QR first.",
      "KIOSK_SESSION_REQUIRED"
    );
  }
  return ctx;
}

export async function bindJobToUserKiosk(jobId: string, userId: string) {
  const [job] = await db
    .select()
    .from(printJobs)
    .where(and(eq(printJobs.id, jobId), eq(printJobs.userId, userId)))
    .limit(1);
  if (!job) throw new NotFoundError("Job not found");

  const { kiosk } = await assertKioskSessionForUser(userId);

  if (job.kioskId && job.kioskId !== kiosk.id) {
    throw new PrintJobError("Job is bound to a different kiosk");
  }
  if (job.kioskId === kiosk.id) {
    return job;
  }

  const [updated] = await db
    .update(printJobs)
    .set({
      kioskId: kiosk.id,
    })
    .where(eq(printJobs.id, jobId))
    .returning();

  await addEvent(jobId, PrintJobEventType.KIOSK_SELECTED, {
    kiosk_code: kiosk.kioskCode,
    public_token: kiosk.publicToken,
  });

  return updated!;
}

/** Bind all paid, undispatched jobs to this kiosk and try to dispatch them. */
export async function releaseReadyJobsToKiosk(userId: string, kioskId: string) {
  const [kiosk] = await db
    .select()
    .from(kiosks)
    .where(eq(kiosks.id, kioskId))
    .limit(1);
  if (!kiosk || kiosk.status !== "ACTIVE") {
    throw new NotFoundError("Kiosk not found");
  }

  const ready = await db
    .select()
    .from(printJobs)
    .where(
      and(
        eq(printJobs.userId, userId),
        eq(printJobs.paymentStatus, "PAID"),
        or(eq(printJobs.status, "QUEUED"), eq(printJobs.status, "PAID")),
        isNull(printJobs.dispatchedAt)
      )
    );

  const releasedIds: string[] = [];
  for (const job of ready) {
    if (job.kioskId && job.kioskId !== kioskId) {
      continue;
    }
    if (job.kioskId !== kioskId) {
      await db.update(printJobs).set({ kioskId }).where(eq(printJobs.id, job.id));
      await addEvent(job.id, PrintJobEventType.KIOSK_SELECTED, {
        kiosk_code: kiosk.kioskCode,
        public_token: kiosk.publicToken,
      });
    }
    releasedIds.push(job.id);
  }

  if (releasedIds.length > 0) {
    void enqueueDispatchForKiosk(kioskId);
  }

  return releasedIds;
}
