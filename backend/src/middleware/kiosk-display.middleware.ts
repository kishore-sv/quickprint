import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "../db";
import { kiosks } from "../db/schema";
import { authenticateKioskDisplay } from "../services/kiosk-display-auth.service";
import {
  displayBootstrapPairingErrorUrl,
  isDisplayFormBootstrapRequest,
} from "../utils/display-redirect-url";
import {
  DISPLAY_SESSION_COOKIE,
  parseCookieHeader,
  verifyDisplaySessionCookie,
} from "../services/kiosk-display-session.service";
import { AuthenticationError } from "../utils/errors";
import { paramId } from "../utils/params";
import { parseDisplayAuthHeader } from "../ws/kiosk-display.protocol";

declare global {
  namespace Express {
    interface Request {
      kioskDisplay?: typeof kiosks.$inferSelect;
    }
  }
}

function bootstrapPairingErrorRedirect(req: Request): string | null {
  if (!isDisplayFormBootstrapRequest(req)) return null;
  return displayBootstrapPairingErrorUrl();
}

export async function resolveKioskFromDisplaySession(
  req: Request
): Promise<typeof kiosks.$inferSelect | null> {
  const cookies = parseCookieHeader(
    typeof req.headers.cookie === "string" ? req.headers.cookie : undefined
  );
  const session = verifyDisplaySessionCookie(cookies[DISPLAY_SESSION_COOKIE]);
  if (!session) return null;

  const [kiosk] = await db
    .select()
    .from(kiosks)
    .where(eq(kiosks.id, session.kioskId))
    .limit(1);
  if (!kiosk || kiosk.status !== "ACTIVE") return null;
  if (kiosk.kioskCode !== session.kioskCode) return null;
  return kiosk;
}

export async function requireKioskDisplayAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const fromCookie = await resolveKioskFromDisplaySession(req);
    if (!fromCookie) {
      throw new AuthenticationError();
    }
    req.kioskDisplay = fromCookie;
    next();
  } catch (e) {
    next(e);
  }
}

export async function requireKioskDisplayPairingAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const kioskCode = paramId(req.params.kioskCode);

    const authRaw = req.headers.authorization ?? req.headers.Authorization;
    const authHeader = Array.isArray(authRaw) ? authRaw[0] : String(authRaw ?? "");
    const fromHeader = parseDisplayAuthHeader(authHeader);
    if (fromHeader) {
      const auth = await authenticateKioskDisplay(fromHeader.kioskCode, fromHeader.secret);
      if (!auth.ok || auth.kiosk.kioskCode !== kioskCode) {
        throw new AuthenticationError();
      }
      req.kioskDisplay = auth.kiosk;
      return next();
    }

    const bodyToken =
      typeof req.body?.display_token === "string" ? req.body.display_token.trim() : "";
    if (bodyToken) {
      const auth = await authenticateKioskDisplay(kioskCode, bodyToken);
      if (!auth.ok) {
        throw new AuthenticationError();
      }
      req.kioskDisplay = auth.kiosk;
      return next();
    }

    throw new AuthenticationError();
  } catch (e) {
    const errorRedirect = bootstrapPairingErrorRedirect(req);
    if (errorRedirect) {
      res.redirect(302, errorRedirect);
      return;
    }
    next(e);
  }
}

/** @deprecated Use requireKioskDisplayPairingAuth */
export const requireKioskDisplayBearerAuth = requireKioskDisplayPairingAuth;
