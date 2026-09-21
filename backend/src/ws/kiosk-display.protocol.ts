import { z } from "zod";

export const DISPLAY_WS_PATH = "/ws/kiosk-display";

export const KioskDisplayEventType = {
  JOB_STATUS: "kiosk.job.status",
} as const;

export const KioskDisplayPrinterEventType = {
  PRINTER_STATUS: "kiosk.printer.status",
} as const;

export const kioskDisplayEventSchema = z.object({
  type: z.literal(KioskDisplayEventType.JOB_STATUS),
  kioskCode: z.string(),
  jobId: z.string(),
  status: z.enum(["RECEIVED", "PREPARED", "PRINTING", "COMPLETED", "FAILED"]),
  updatedAt: z.string(),
});

export type KioskDisplayEventPayload = z.infer<typeof kioskDisplayEventSchema>;

export function parseDisplayAuthHeader(
  header: string | undefined
): { kioskCode: string; secret: string } | null {
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  const colon = token.indexOf(":");
  if (colon <= 0) return null;
  const kioskCode = token.slice(0, colon);
  const secret = token.slice(colon + 1);
  if (!kioskCode || !secret) return null;
  return { kioskCode, secret };
}
