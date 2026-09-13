import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { eq, or } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../db";
import { kiosks } from "../db/schema";

function pepper(): string {
  return env.KIOSK_AGENT_TOKEN_PEPPER ?? env.BETTER_AUTH_SECRET;
}

export function hashAgentToken(plaintext: string): string {
  return createHmac("sha256", pepper()).update(plaintext).digest("hex");
}

export function generateAgentToken(): string {
  return randomBytes(32).toString("base64url");
}

export function verifyAgentToken(plaintext: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  const expected = hashAgentToken(plaintext);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(storedHash));
  } catch {
    return false;
  }
}

const KIOSK_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isKioskUuid(value: string): boolean {
  return KIOSK_UUID_RE.test(value);
}

export type KioskAgentAuthFailure =
  | "kiosk_not_found"
  | "kiosk_inactive"
  | "token_not_configured"
  | "token_mismatch";

export async function authenticateKioskAgent(
  agentId: string,
  secret: string
): Promise<
  | { ok: true; kiosk: typeof kiosks.$inferSelect }
  | { ok: false; reason: KioskAgentAuthFailure }
> {
  const [kiosk] = await db
    .select()
    .from(kiosks)
    .where(
      isKioskUuid(agentId)
        ? eq(kiosks.id, agentId)
        : or(eq(kiosks.kioskCode, agentId), eq(kiosks.publicToken, agentId))
    )
    .limit(1);
  if (!kiosk) return { ok: false, reason: "kiosk_not_found" };
  if (kiosk.status !== "ACTIVE") return { ok: false, reason: "kiosk_inactive" };
  if (!kiosk.agentTokenHash) return { ok: false, reason: "token_not_configured" };
  if (!verifyAgentToken(secret, kiosk.agentTokenHash)) {
    return { ok: false, reason: "token_mismatch" };
  }
  return { ok: true, kiosk };
}
