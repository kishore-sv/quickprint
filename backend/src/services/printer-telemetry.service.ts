import { eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../db";
import { kioskPrinterState, kioskPrinterStateEvents, kiosks } from "../db/schema";
import {
  ConnectionState,
  OperationalState,
  PrinterDisplayState,
  type PrinterCapabilitiesJson,
  type KioskDisplayPrinterSnapshot,
  type ResolvedPrinterTelemetry,
} from "../types/printer-telemetry";
import { logOperationalEvent } from "./operational-log.service";
import type { PiPrinterTelemetryMessage } from "../ws/kiosk-agent.protocol";
import { getKioskDisplayRegistry } from "../ws/kiosk-display.registry";
import { KioskDisplayPrinterEventType } from "../ws/kiosk-display.protocol";
const kioskTelemetryChains = new Map<string, Promise<unknown>>();

export function acceptTelemetrySequence(
  lastSequence: number | null | undefined,
  incomingSequence: number
): boolean {
  if (lastSequence == null) return true;
  return incomingSequence > lastSequence;
}

function withKioskTelemetryLock<T>(kioskId: string, fn: () => Promise<T>): Promise<T> {
  const prev = kioskTelemetryChains.get(kioskId) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  kioskTelemetryChains.set(kioskId, next);
  return next.finally(() => {
    if (kioskTelemetryChains.get(kioskId) === next) {
      kioskTelemetryChains.delete(kioskId);
    }
  });
}

function parseIsoDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function defaultResolved(): ResolvedPrinterTelemetry {
  return {
    printer_name: null,
    connection_state: ConnectionState.UNKNOWN,
    operational_state: OperationalState.UNKNOWN,
    display_state: PrinterDisplayState.UNKNOWN,
    reasons: [],
    raw_reasons: [],
    capabilities: null,
    telemetry_fresh: false,
    telemetry_last_seen_at: null,
    updated_at: null,
  };
}

export function toKioskDisplayPrinterSnapshot(
  resolved: ResolvedPrinterTelemetry
): KioskDisplayPrinterSnapshot {
  return {
    display_state: resolved.display_state,
    connection_state: resolved.connection_state,
    operational_state: resolved.operational_state,
    reasons: resolved.reasons,
    telemetry_fresh: resolved.telemetry_fresh,
    updated_at: resolved.updated_at,
  };
}

export async function broadcastKioskPrinterStatus(
  kiosk: InferSelectModel<typeof kiosks>,
  resolved: ResolvedPrinterTelemetry,
  sequence?: number
): Promise<void> {
  const event = {
    type: KioskDisplayPrinterEventType.PRINTER_STATUS,
    kioskCode: kiosk.kioskCode,
    printer: toKioskDisplayPrinterSnapshot(resolved),
    updatedAt: new Date().toISOString(),
    sequence: sequence ?? Date.now(),
  };
  getKioskDisplayRegistry().broadcast(kiosk.id, JSON.stringify(event));
}

export function resolvePrinterTelemetryForKiosk(
  row: InferSelectModel<typeof kioskPrinterState> | null | undefined
): ResolvedPrinterTelemetry {
  if (!row) {
    return defaultResolved();
  }
  const lastSeen = row.telemetryLastSeenAt;
  const fresh =
    lastSeen != null &&
    Date.now() - lastSeen.getTime() <= env.PRINTER_TELEMETRY_STALE_SECONDS * 1000;

  let displayState = row.displayState as PrinterDisplayState;
  if (!fresh) {
    displayState = PrinterDisplayState.TELEMETRY_STALE;
  }

  return {
    printer_name: row.printerName,
    connection_state: row.connectionState as ConnectionState,
    operational_state: row.operationalState as OperationalState,
    display_state: displayState,
    reasons: row.reasons ?? [],
    raw_reasons: row.rawReasons ?? [],
    capabilities: (row.capabilities as PrinterCapabilitiesJson | null) ?? null,
    telemetry_fresh: fresh,
    telemetry_last_seen_at: lastSeen?.toISOString() ?? null,
    updated_at: row.updatedAt?.toISOString() ?? null,
  };
}

export async function getKioskPrinterStateRow(kioskId: string) {
  const [row] = await db
    .select()
    .from(kioskPrinterState)
    .where(eq(kioskPrinterState.kioskId, kioskId))
    .limit(1);
  return row ?? null;
}

export async function resolvePrinterTelemetryByKioskId(
  kioskId: string
): Promise<ResolvedPrinterTelemetry> {
  const row = await getKioskPrinterStateRow(kioskId);
  return resolvePrinterTelemetryForKiosk(row);
}

export async function applyPrinterTelemetry(
  kioskId: string,
  msg: PiPrinterTelemetryMessage
): Promise<void> {
  return withKioskTelemetryLock(kioskId, () => applyPrinterTelemetryLocked(kioskId, msg));
}

async function applyPrinterTelemetryLocked(
  kioskId: string,
  msg: PiPrinterTelemetryMessage
): Promise<void> {
  const existing = await getKioskPrinterStateRow(kioskId);
  if (!acceptTelemetrySequence(existing?.lastSequence, msg.sequence)) {
    return;
  }

  const now = new Date();
  const probeAt = parseIsoDate(msg.last_probe_at);
  const prevDisplay = existing?.displayState;
  const prevConnection = existing?.connectionState;

  const stateChanged =
    !existing ||
    existing.connectionState !== msg.connection_state ||
    existing.operationalState !== msg.operational_state ||
    existing.displayState !== msg.display_state ||
    JSON.stringify(existing.reasons) !== JSON.stringify(msg.reasons ?? []);

  const values = {
    kioskId,
    printerName: msg.printer_name ?? existing?.printerName ?? null,
    connectionState: msg.connection_state,
    operationalState: msg.operational_state,
    displayState: msg.display_state,
    reasons: msg.reasons ?? [],
    rawReasons: msg.raw_reasons ?? [],
    capabilities: msg.capabilities ?? existing?.capabilities ?? null,
    telemetryLastSeenAt: now,
    stateChangedAt: stateChanged ? now : existing?.stateChangedAt ?? now,
    updatedAt: now,
    lastSequence: msg.sequence,
    lastEventId: msg.event_id,
    lastProbeAt: probeAt ?? existing?.lastProbeAt ?? null,
  };

  if (existing) {
    await db
      .update(kioskPrinterState)
      .set(values)
      .where(eq(kioskPrinterState.kioskId, kioskId));
  } else {
    await db.insert(kioskPrinterState).values(values);
  }

  if (
    stateChanged &&
    !msg.is_heartbeat &&
    (prevDisplay !== msg.display_state || prevConnection !== msg.connection_state)
  ) {
    await db.insert(kioskPrinterStateEvents).values({
      kioskId,
      connectionState: msg.connection_state,
      displayState: msg.display_state,
      reasons: msg.reasons ?? [],
      rawReasons: msg.raw_reasons ?? [],
      sequence: msg.sequence,
    });

    await logOperationalEvent({
      level: "INFO",
      event: "PRINTER_TELEMETRY_CHANGED",
      actor: { type: "kiosk", id: kioskId },
      resource: { type: "kiosk", id: kioskId },
      kioskId,
      message: `Printer telemetry: ${msg.connection_state} / ${msg.display_state}`,
      metadata: {
        operational_state: msg.operational_state,
        raw_reasons: msg.raw_reasons,
      },
    });

    const errorDisplays = new Set([
      PrinterDisplayState.ERROR,
      PrinterDisplayState.OFFLINE,
      PrinterDisplayState.PAPER_OUT,
      PrinterDisplayState.PAPER_JAM,
    ]);
    if (errorDisplays.has(msg.display_state as PrinterDisplayState)) {
      await logOperationalEvent({
        level: "WARNING",
        event: "PRINTER_ERROR",
        actor: { type: "kiosk", id: kioskId },
        resource: { type: "kiosk", id: kioskId },
        kioskId,
        message: `Printer state: ${msg.display_state}`,
        metadata: { raw_reasons: msg.raw_reasons },
      });
    }
  }

  const shouldBroadcast =
    stateChanged || msg.is_heartbeat || !existing;
  if (shouldBroadcast) {
    const [kiosk] = await db.select().from(kiosks).where(eq(kiosks.id, kioskId)).limit(1);
    if (kiosk) {
      const resolved = resolvePrinterTelemetryForKiosk({
        ...values,
        updatedAt: now,
        telemetryLastSeenAt: now,
      } as InferSelectModel<typeof kioskPrinterState>);
      await broadcastKioskPrinterStatus(kiosk, resolved, msg.sequence);
    }
  }
}
