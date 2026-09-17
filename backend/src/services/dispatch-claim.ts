import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { printJobs } from "../db/schema";

/** Atomic dispatch claim: PAID QUEUED job with no prior dispatch. */
export function buildDispatchClaimWhere(kioskId: string, jobId: string) {
  return and(
    eq(printJobs.id, jobId),
    eq(printJobs.kioskId, kioskId),
    eq(printJobs.paymentStatus, "PAID"),
    eq(printJobs.status, "QUEUED"),
    isNull(printJobs.dispatchedAt)
  );
}

/**
 * Paid cancellation mutex: QUEUED only when not yet dispatched;
 * CLAIMED/DOWNLOADING remain cancellable after Pi ack.
 */
export function buildPaidCancellationWhere(jobId: string) {
  return and(
    eq(printJobs.id, jobId),
    or(
      and(eq(printJobs.status, "QUEUED"), isNull(printJobs.dispatchedAt)),
      inArray(printJobs.status, ["CLAIMED", "DOWNLOADING"])
    )
  );
}

export function buildUnpaidCancellationWhere(jobId: string) {
  return and(
    eq(printJobs.id, jobId),
    inArray(printJobs.status, ["CREATED", "PAYMENT_PENDING", "QUEUED"])
  );
}
