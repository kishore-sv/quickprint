import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../db";
import { kiosks } from "../db/schema";

function pepper(): string {
  return env.KIOSK_AGENT_TOKEN_PEPPER ?? env.BETTER_AUTH_SECRET;
}

export function hashDisplayToken(plaintext: string): string {
  return createHmac("sha256", pepper()).update(`display:${plaintext}`).digest("hex");
}

export function generateDisplayToken(): string {
  return randomBytes(32).toString("base64url");
}

export function verifyDisplayToken(plaintext: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  const expected = hashDisplayToken(plaintext);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(storedHash));
  } catch {
    return false;
  }
}

export type KioskDisplayAuthFailure =
  | "kiosk_not_found"
  | "kiosk_inactive"
  | "token_not_configured"
  | "token_mismatch";

export async function authenticateKioskDisplay(
  kioskCode: string,
  secret: string
): Promise<
  | { ok: true; kiosk: typeof kiosks.$inferSelect }
  | { ok: false; reason: KioskDisplayAuthFailure }
> {
  const [kiosk] = await db
    .select()
    .from(kiosks)
    .where(eq(kiosks.kioskCode, kioskCode))
    .limit(1);
  if (!kiosk) return { ok: false, reason: "kiosk_not_found" };
  if (kiosk.status !== "ACTIVE") return { ok: false, reason: "kiosk_inactive" };
  if (!kiosk.displayTokenHash) return { ok: false, reason: "token_not_configured" };
  if (!verifyDisplayToken(secret, kiosk.displayTokenHash)) {
    return { ok: false, reason: "token_mismatch" };
  }
  return { ok: true, kiosk };
}
