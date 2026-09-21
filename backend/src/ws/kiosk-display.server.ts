import type { WebSocket } from "ws";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { kiosks } from "../db/schema";
import { getKioskDisplayState } from "../services/kiosk-display.service";
import { KioskDisplayPrinterEventType } from "./kiosk-display.protocol";
import {
  DISPLAY_SESSION_COOKIE,
  parseCookieHeader,
  verifyDisplaySessionCookie,
} from "../services/kiosk-display-session.service";
import { wsLogger } from "../utils/logger";
import { getKioskDisplayRegistry } from "./kiosk-display.registry";

type UpgradeRequest = {
  cookieHeader?: string | string[];
  url?: string;
};

async function resolveKioskFromWsRequest(
  req: UpgradeRequest
): Promise<typeof kiosks.$inferSelect | null> {
  const cookieRaw = Array.isArray(req.cookieHeader)
    ? req.cookieHeader[0]
    : req.cookieHeader;
  const cookies = parseCookieHeader(cookieRaw);
  const session = verifyDisplaySessionCookie(cookies[DISPLAY_SESSION_COOKIE]);
  if (!session) return null;

  const [kiosk] = await db
    .select()
    .from(kiosks)
    .where(eq(kiosks.id, session.kioskId))
    .limit(1);
  if (!kiosk || kiosk.status !== "ACTIVE" || kiosk.kioskCode !== session.kioskCode) {
    return null;
  }
  return kiosk;
}

export async function handleKioskDisplayConnection(ws: WebSocket, req: UpgradeRequest) {
  const kiosk = await resolveKioskFromWsRequest(req);
  if (!kiosk) {
    ws.close(4401, "unauthorized");
    return;
  }

  const registry = getKioskDisplayRegistry();
  registry.register(kiosk.id, ws);

  try {
    const state = await getKioskDisplayState(kiosk);
    ws.send(
      JSON.stringify({
        type: KioskDisplayPrinterEventType.PRINTER_STATUS,
        kioskCode: state.kioskCode,
        printer: state.printer,
        updatedAt: state.updatedAt,
      })
    );
    if (state.state !== "IDLE" && state.jobId) {
      const status =
        state.state === "RECEIVED"
          ? "RECEIVED"
          : state.state === "PREPARED"
            ? "PREPARED"
            : state.state === "PRINTING"
              ? "PRINTING"
              : state.state === "COMPLETED"
                ? "COMPLETED"
                : state.state === "FAILED"
                  ? "FAILED"
                  : "RECEIVED";
      ws.send(
        JSON.stringify({
          type: "kiosk.job.status",
          kioskCode: state.kioskCode,
          jobId: state.jobId,
          status,
          updatedAt: state.updatedAt,
        })
      );
    }
  } catch (e) {
    wsLogger.warn({ kioskId: kiosk.id, err: e }, "ws display initial state failed");
  }
}
