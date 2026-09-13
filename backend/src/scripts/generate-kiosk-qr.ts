/**
 * Generate QR PNG for Kiosk-1 scan URL.
 * Usage: bun run src/scripts/generate-kiosk-qr.ts
 */

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import QRCode from "qrcode";
import { eq, or } from "drizzle-orm";
import { db, pool } from "../db";
import { kiosks } from "../db/schema";
import { env } from "../config/env";

const KIOSK_CODE = "KIOSK-001";
const KIOSK_NAME = "Kiosk-1";

export function buildKioskScanUrl(publicToken: string, appBaseUrl: string): string {
  const base = appBaseUrl.replace(/\/$/, "");
  return `${base}/scan/${encodeURIComponent(publicToken)}`;
}

async function main() {
  const [kiosk] = await db
    .select()
    .from(kiosks)
    .where(or(eq(kiosks.kioskCode, KIOSK_CODE), eq(kiosks.name, KIOSK_NAME)))
    .limit(1);

  if (!kiosk?.publicToken) {
    console.error("Kiosk-1 not found or missing public_token. Run: bun run kiosk:seed");
    process.exit(1);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.FRONTEND_URL ?? env.FRONTEND_URL;
  const scanUrl = buildKioskScanUrl(kiosk.publicToken, appUrl);

  const outDir = join(process.cwd(), "..", "generated");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, "qr-kiosk-1.png");

  await QRCode.toFile(outPath, scanUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 512,
  });

  console.log("Scan URL:", scanUrl);
  console.log("QR PNG:", outPath);

  await pool.end();
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
