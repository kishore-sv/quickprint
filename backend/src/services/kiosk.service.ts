import { and, eq, gt, or } from "drizzle-orm";
import { db } from "../db";
import { kioskSessions, kiosks } from "../db/schema";
import { NotFoundError, PrintJobError } from "../utils/errors";

export async function resolveKiosk(tokenOrCode: string) {
  const [kiosk] = await db
    .select()
    .from(kiosks)
    .where(
      or(eq(kiosks.publicToken, tokenOrCode), eq(kiosks.kioskCode, tokenOrCode))
    )
    .limit(1);
  if (!kiosk) throw new NotFoundError("Kiosk not found");
  return kiosk;
}

export async function assertActiveKioskSession(userId: string, kioskId: string) {
  const now = new Date();
  const [session] = await db
    .select()
    .from(kioskSessions)
    .where(
      and(
        eq(kioskSessions.userId, userId),
        eq(kioskSessions.kioskId, kioskId),
        gt(kioskSessions.expiresAt, now)
      )
    )
    .limit(1);
  if (!session) {
    throw new PrintJobError(
      "No active kiosk session. Scan the kiosk QR first.",
      "KIOSK_SESSION_REQUIRED"
    );
  }
  return session;
}
