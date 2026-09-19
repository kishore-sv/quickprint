import { eq } from "drizzle-orm";
import { db } from "../db";
import { kiosks } from "../db/schema";
import { logOperationalEvent } from "./operational-log.service";

export async function persistAgentHeartbeat(
  kioskId: string,
  health?: Record<string, unknown> | null
) {
  const agentVersion =
    health && typeof health.agent_version === "string" ? health.agent_version : undefined;

  await db
    .update(kiosks)
    .set({
      lastSeenAt: new Date(),
      ...(health ? { agentHealth: health } : {}),
      ...(agentVersion ? { agentVersion } : {}),
      updatedAt: new Date(),
    })
    .where(eq(kiosks.id, kioskId));

  if (health && health.printer_ok === false) {
    await logOperationalEvent({
      level: "WARNING",
      event: "PRINTER_ERROR",
      actor: { type: "kiosk", id: kioskId },
      resource: { type: "kiosk", id: kioskId },
      kioskId,
      message: typeof health.message === "string" ? health.message : "Printer not ready",
      metadata: {
        printer_ok: health.printer_ok,
        cups_printer_name: health.cups_printer_name,
      },
    });
  }
}

export async function logAgentConnected(kioskId: string) {
  await logOperationalEvent({
    level: "INFO",
    event: "AGENT_CONNECTED",
    actor: { type: "kiosk", id: kioskId },
    resource: { type: "kiosk", id: kioskId },
    kioskId,
    message: "Pi agent connected",
  });
  await logOperationalEvent({
    level: "INFO",
    event: "KIOSK_ONLINE",
    actor: { type: "kiosk", id: kioskId },
    resource: { type: "kiosk", id: kioskId },
    kioskId,
    message: "Kiosk is online",
  });
}

export async function logAgentDisconnected(kioskId: string) {
  await logOperationalEvent({
    level: "WARNING",
    event: "AGENT_DISCONNECTED",
    actor: { type: "kiosk", id: kioskId },
    resource: { type: "kiosk", id: kioskId },
    kioskId,
    message: "Pi agent disconnected",
  });
  await logOperationalEvent({
    level: "WARNING",
    event: "KIOSK_OFFLINE",
    actor: { type: "kiosk", id: kioskId },
    resource: { type: "kiosk", id: kioskId },
    kioskId,
    message: "Kiosk is offline",
  });
}

export function extractPrinterSummary(
  health: Record<string, unknown> | null | undefined
) {
  if (!health) {
    return { name: null, status: "unknown", ready: false };
  }
  const name =
    typeof health.cups_printer_name === "string" ? health.cups_printer_name : null;
  const ready = health.printer_ok === true;
  let status = "unknown";
  if (ready) status = "ready";
  else if (health.printer_ok === false) status = "error";
  else if (health.printer_available === false) status = "unavailable";
  return { name, status, ready };
}
