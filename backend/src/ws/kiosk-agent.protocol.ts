/**
 * WebSocket protocol aligned with quickprint-pi-agent/app/protocol.py
 */

import { z } from "zod";

/** Inbound to Pi agent */
export const PiInboundType = {
  JOB_ASSIGNED: "job.assigned",
  JOB_CANCEL: "job.cancel",
  PING: "ping",
} as const;

/** Outbound from Pi agent */
export const PiOutboundType = {
  JOB_RECEIVED: "job.received",
  JOB_DOWNLOADING: "job.downloading",
  JOB_READY: "job.ready",
  JOB_SUBMITTED: "job.submitted",
  JOB_PRINTING: "job.printing",
  JOB_COMPLETED: "job.completed",
  JOB_FAILED: "job.failed",
  AGENT_HEARTBEAT: "agent.heartbeat",
  PRINTER_TELEMETRY: "printer.telemetry",
  PONG: "pong",
} as const;

const connectionStateSchema = z.enum(["ONLINE", "OFFLINE", "UNKNOWN"]);
const operationalStateSchema = z.enum([
  "IDLE",
  "PRINTING",
  "ERROR",
  "PAPER_OUT",
  "PAPER_JAM",
  "TONER_LOW",
  "TONER_OUT",
  "COVER_OPEN",
  "PAUSED",
  "DISABLED",
  "UNKNOWN",
]);
const printerDisplayStateSchema = z.enum([
  "READY",
  "PRINTING",
  "OFFLINE",
  "ERROR",
  "PAPER_OUT",
  "PAPER_JAM",
  "TONER_LOW",
  "TONER_OUT",
  "COVER_OPEN",
  "PAUSED",
  "DISABLED",
  "UNKNOWN",
]);

export const piPrinterTelemetrySchema = z.object({
  type: z.literal(PiOutboundType.PRINTER_TELEMETRY),
  agent_id: z.string().optional(),
  event_id: z.string(),
  sequence: z.number().int(),
  timestamp: z.string(),
  printer_name: z.string().optional(),
  connection_state: connectionStateSchema,
  operational_state: operationalStateSchema,
  display_state: printerDisplayStateSchema,
  reasons: z.array(z.string()).optional(),
  raw_reasons: z.array(z.string()).optional(),
  last_probe_at: z.string().optional(),
  capabilities: z.record(z.unknown()).optional(),
  is_heartbeat: z.boolean().optional(),
  active_job_id: z.string().nullable().optional(),
});

export type PiPrinterTelemetryMessage = z.infer<typeof piPrinterTelemetrySchema>;

export const piOutboundMessageSchema = z
  .object({
    type: z.string(),
    job_id: z.string().optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    cups_job_id: z.string().optional(),
    agent_id: z.string().optional(),
    health: z.record(z.unknown()).optional(),
  })
  .passthrough();

export type PiOutboundMessage = z.infer<typeof piOutboundMessageSchema>;

/** Pi agent expects null for "all pages"; DB/API store "all". */
export function pageRangeForPiAgent(pageRange: string): string | null {
  const trimmed = pageRange.trim();
  if (trimmed.toLowerCase() === "all") return null;
  return trimmed;
}

export function buildJobAssignedMessage(fields: {
  job_id: string;
  file_url: string;
  filename: string;
  print_settings: Record<string, unknown>;
}): string {
  return JSON.stringify({
    type: PiInboundType.JOB_ASSIGNED,
    ...fields,
  });
}

export function buildJobCancelMessage(fields: { job_id: string }): string {
  return JSON.stringify({
    type: PiInboundType.JOB_CANCEL,
    job_id: fields.job_id,
  });
}

export function buildPingMessage(): string {
  return JSON.stringify({ type: PiInboundType.PING });
}

export function buildPongMessage(): string {
  return JSON.stringify({ type: PiOutboundType.PONG });
}

export function parseAgentAuthHeader(
  header: string | undefined
): { agentId: string; secret: string } | null {
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  const colon = token.indexOf(":");
  if (colon <= 0) return null;
  const agentId = token.slice(0, colon);
  const secret = token.slice(colon + 1);
  if (!agentId || !secret) return null;
  return { agentId, secret };
}

/** Map Pi outbound message types to internal status keys */
export const PI_OUTBOUND_TO_STATUS: Record<string, string> = {
  [PiOutboundType.JOB_RECEIVED]: "RECEIVED",
  [PiOutboundType.JOB_DOWNLOADING]: "DOWNLOADING",
  [PiOutboundType.JOB_READY]: "READY",
  [PiOutboundType.JOB_SUBMITTED]: "SUBMITTED",
  [PiOutboundType.JOB_PRINTING]: "PRINTING",
  [PiOutboundType.JOB_COMPLETED]: "COMPLETED",
  [PiOutboundType.JOB_FAILED]: "FAILED",
};

export function piMessageTypeToStatus(messageType: string): string | null {
  return PI_OUTBOUND_TO_STATUS[messageType] ?? null;
}
