import type { InferSelectModel } from "drizzle-orm";
import type { kiosks } from "../db/schema";
import { env } from "../config/env";
import { getKioskAgentRegistry } from "../ws/kiosk-agent.registry";
import { resolvePrinterTelemetryByKioskId } from "./printer-telemetry.service";
import { PrinterDisplayState } from "../types/printer-telemetry";

export function isKioskServiceOnline(kiosk: Pick<InferSelectModel<typeof kiosks>, "id" | "lastSeenAt">): boolean {
  const registry = getKioskAgentRegistry();
  if (!registry.isOnline(kiosk.id)) {
    return false;
  }
  if (!kiosk.lastSeenAt) {
    return true;
  }
  const ageMs = Date.now() - kiosk.lastSeenAt.getTime();
  return ageMs <= env.KIOSK_HEARTBEAT_TIMEOUT_SECONDS * 1000;
}

export async function serializeKioskServiceStatus(kiosk: InferSelectModel<typeof kiosks>) {
  const printerTelemetry = await resolvePrinterTelemetryByKioskId(kiosk.id);
  const display = printerTelemetry.display_state;
  let message: string | null = null;
  if (display === PrinterDisplayState.TELEMETRY_STALE) {
    message = "Printer status is temporarily unavailable.";
  } else if (display === PrinterDisplayState.OFFLINE) {
    message = "Printer appears offline.";
  } else if (display === PrinterDisplayState.UNKNOWN) {
    message = "Printer status unknown.";
  }

  return {
    kiosk: {
      id: kiosk.id,
      name: kiosk.name,
      kiosk_code: kiosk.kioskCode,
      location: kiosk.location,
    },
    service: {
      online: isKioskServiceOnline(kiosk),
      last_seen: kiosk.lastSeenAt ?? null,
    },
    printer: {
      display_state: printerTelemetry.display_state,
      telemetry_fresh: printerTelemetry.telemetry_fresh,
      message,
    },
  };
}
