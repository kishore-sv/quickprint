import { eq } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../db";
import { kioskPrinterState, kiosks } from "../db/schema";
import { logger } from "../utils/logger";
import {
  broadcastKioskPrinterStatus,
  resolvePrinterTelemetryForKiosk,
} from "./printer-telemetry.service";

/** Tracks whether we already broadcast TELEMETRY_STALE for a kiosk (avoid spam). */
const staleBroadcastSent = new Map<string, boolean>();

let monitorTimer: ReturnType<typeof setInterval> | null = null;

export async function sweepStalePrinterTelemetry(): Promise<void> {
  const rows = await db.select().from(kioskPrinterState);
  for (const row of rows) {
    const resolved = resolvePrinterTelemetryForKiosk(row);
    const isStale = !resolved.telemetry_fresh;
    const wasMarkedStale = staleBroadcastSent.get(row.kioskId) ?? false;

    if (isStale && !wasMarkedStale) {
      const [kiosk] = await db
        .select()
        .from(kiosks)
        .where(eq(kiosks.id, row.kioskId))
        .limit(1);
      if (kiosk) {
        logger.info(
          { kioskId: row.kioskId, lastSeen: row.telemetryLastSeenAt },
          "printer telemetry stale; broadcasting TELEMETRY_STALE"
        );
        await broadcastKioskPrinterStatus(kiosk, resolved);
      }
      staleBroadcastSent.set(row.kioskId, true);
    } else if (!isStale && wasMarkedStale) {
      staleBroadcastSent.set(row.kioskId, false);
    }
  }
}

export function startPrinterTelemetryStaleMonitor(): void {
  if (monitorTimer) return;
  const intervalMs = Math.max(
    5_000,
    Math.min(env.PRINTER_TELEMETRY_STALE_SECONDS * 1000, 15_000)
  );
  monitorTimer = setInterval(() => {
    void sweepStalePrinterTelemetry().catch((err) => {
      logger.warn({ err }, "printer telemetry stale sweep failed");
    });
  }, intervalMs);
}

export function clearStaleBroadcastLatchForKiosk(kioskId: string): void {
  staleBroadcastSent.delete(kioskId);
}

export function stopPrinterTelemetryStaleMonitor(): void {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}
