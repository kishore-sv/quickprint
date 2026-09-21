import { and, count, eq, gte } from "drizzle-orm";
import { db } from "../../db";
import { kiosks, printJobs } from "../../db/schema";
import { isKioskServiceOnline } from "../kiosk-status.service";
import { resolvePrinterTelemetryByKioskId } from "../printer-telemetry.service";
import { istDayStart } from "../../utils/ist";
import { parsePageRange } from "../pricing.service";

export async function listAdminPrinters() {
  const todayStart = istDayStart();
  const allKiosks = await db.select().from(kiosks);

  const items = await Promise.all(
    allKiosks.map(async (kiosk) => {
      const health = kiosk.agentHealth as Record<string, unknown> | null;
      const telemetry = await resolvePrinterTelemetryByKioskId(kiosk.id);
      const caps = telemetry.capabilities;

      const completedToday = await db
        .select({
          pageCount: printJobs.pageCount,
          copies: printJobs.copies,
          pageRange: printJobs.pageRange,
        })
        .from(printJobs)
        .where(
          and(
            eq(printJobs.kioskId, kiosk.id),
            eq(printJobs.status, "COMPLETED"),
            gte(printJobs.completedAt, todayStart)
          )
        );

      let pagesToday = 0;
      for (const row of completedToday) {
        try {
          pagesToday += parsePageRange(row.pageRange, row.pageCount).length * row.copies;
        } catch {
          pagesToday += row.pageCount * row.copies;
        }
      }

      const [jobsToday] = await db
        .select({ count: count() })
        .from(printJobs)
        .where(and(eq(printJobs.kioskId, kiosk.id), gte(printJobs.createdAt, todayStart)));

      const connection =
        typeof health?.backend_connection === "string" ? health.backend_connection : null;

      const connectionType = caps?.connection_type ?? "unknown";
      const manufacturer = caps?.manufacturer ?? null;
      const model = caps?.model ?? null;

      return {
        kiosk_id: kiosk.id,
        kiosk_code: kiosk.kioskCode,
        kiosk_name: kiosk.name,
        printer_name: telemetry.printer_name ?? "Unknown",
        connection: connectionType,
        manufacturer,
        model,
        cups_queue: telemetry.printer_name,
        status: telemetry.display_state,
        operational_state: telemetry.operational_state,
        connection_state: telemetry.connection_state,
        telemetry_fresh: telemetry.telemetry_fresh,
        telemetry_last_seen: telemetry.telemetry_last_seen_at,
        reasons: telemetry.reasons,
        online: isKioskServiceOnline(kiosk),
        jobs_today: jobsToday?.count ?? 0,
        pages_today: pagesToday,
        last_seen: kiosk.lastSeenAt,
        backend_connection: connection,
      };
    })
  );

  return { items };
}
