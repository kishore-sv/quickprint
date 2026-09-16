/**
 * Idempotent dev kiosk seed.
 * Usage: bun run src/scripts/seed-kiosk-1.ts [--rotate-agent-token] [--rotate-display-token]
 */

import { randomBytes } from "crypto";
import { eq, or } from "drizzle-orm";
import { db, pool } from "../db";
import { kiosks } from "../db/schema";
import {
  generateAgentToken,
  hashAgentToken,
} from "../services/kiosk-agent-auth.service";
import {
  generateDisplayToken,
  hashDisplayToken,
} from "../services/kiosk-display-auth.service";
import { env } from "../config/env";

const KIOSK_CODE = "KIOSK-001";
const KIOSK_NAME = "Development Kiosk";
const LEGACY_KIOSK_NAME = "Kiosk-1";

function publicToken(): string {
  return randomBytes(24).toString("base64url");
}

async function main() {
  const rotateAgent = process.argv.includes("--rotate-agent-token");
  const rotateDisplay = process.argv.includes("--rotate-display-token");

  const [existing] = await db
    .select()
    .from(kiosks)
    .where(
      or(
        eq(kiosks.kioskCode, KIOSK_CODE),
        eq(kiosks.name, KIOSK_NAME),
        eq(kiosks.name, LEGACY_KIOSK_NAME)
      )
    )
    .limit(1);

  let kiosk = existing;
  if (!kiosk) {
    const [created] = await db
      .insert(kiosks)
      .values({
        kioskCode: KIOSK_CODE,
        publicToken: publicToken(),
        name: KIOSK_NAME,
        location: "Development",
        status: "ACTIVE",
      })
      .returning();
    kiosk = created!;
    console.log("Created Kiosk-1");
  } else {
    console.log("Kiosk-1 already exists");
  }

  if (!kiosk.publicToken) {
    const token = publicToken();
    await db.update(kiosks).set({ publicToken: token }).where(eq(kiosks.id, kiosk.id));
    kiosk = { ...kiosk, publicToken: token };
    console.log("Generated missing public_token");
  }

  let agentPlain: string | null = null;
  if (!kiosk.agentTokenHash || rotateAgent) {
    agentPlain = generateAgentToken();
    await db
      .update(kiosks)
      .set({ agentTokenHash: hashAgentToken(agentPlain) })
      .where(eq(kiosks.id, kiosk.id));
    console.log(rotateAgent ? "Rotated agent token" : "Set agent token");
  }

  let displayPlain: string | null = null;
  if (!kiosk.displayTokenHash || rotateDisplay) {
    displayPlain = generateDisplayToken();
    await db
      .update(kiosks)
      .set({ displayTokenHash: hashDisplayToken(displayPlain) })
      .where(eq(kiosks.id, kiosk.id));
    console.log(rotateDisplay ? "Rotated display token" : "Set display token");
  }

  console.log("\n--- Kiosk-1 ---");
  console.log("kiosk_id:", kiosk.id);
  console.log("kiosk_code:", kiosk.kioskCode);
  console.log("kiosk_display_name:", KIOSK_NAME);
  console.log("public_token:", kiosk.publicToken);
  if (agentPlain) {
    console.log("\n--- Pi agent env (save securely; not stored in plaintext) ---");
    console.log(`AGENT_ID=${kiosk.id}`);
    console.log(`AGENT_TOKEN=${agentPlain}`);
    console.log(`BACKEND_WS_URL=ws://<YOUR_LAN_IP>:8000/ws/kiosk`);
    console.log("PRINTER_MODE=mock");
  } else {
    console.log("\nAgent token unchanged. Use --rotate-agent-token to generate a new one.");
  }

  if (displayPlain) {
    const apiUrl = env.BETTER_AUTH_URL.replace(/\/$/, "");
    const displayUrl = `${env.FRONTEND_URL.replace(/\/$/, "")}/kiosk/${kiosk.kioskCode}`;
    console.log("\n--- Pi display env (read-only; separate from agent secret) ---");
    console.log(`KIOSK_CODE=${kiosk.kioskCode}`);
    console.log(`KIOSK_DISPLAY_NAME=${KIOSK_NAME}`);
    console.log(`API_URL=${apiUrl}`);
    console.log(`DISPLAY_URL=${displayUrl}`);
    console.log(`DISPLAY_TOKEN=${displayPlain}`);
  } else {
    console.log("\nDisplay token unchanged. Use --rotate-display-token to generate a new one.");
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
