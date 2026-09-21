import { randomUUID } from "crypto";
import express, { Router } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../db";
import { kioskSessions, kiosks } from "../db/schema";
import { requireAuth } from "../middleware/auth.middleware";
import { clearUserKioskSessions, resolveKiosk } from "../services/kiosk.service";
import { NotFoundError } from "../utils/errors";
import { paramId } from "../utils/params";
import { ok } from "../utils/respond";
import { serializeKioskServiceStatus } from "../services/kiosk-status.service";
import { serializeKiosk } from "../utils/serializers";
import {
  requireKioskDisplayAuth,
  requireKioskDisplayPairingAuth,
} from "../middleware/kiosk-display.middleware";
import { getKioskDisplayState } from "../services/kiosk-display.service";
import { setDisplaySessionCookie } from "../services/kiosk-display-session.service";
import {
  buildKioskDisplayUrl,
  isAllowedDisplayRedirectUrl,
  isDisplayFormBootstrapRequest,
} from "../utils/display-redirect-url";
import { AuthenticationError } from "../utils/errors";

export const kiosksRoutes = Router();

kiosksRoutes.post(
  "/kiosks/:kioskCode/display-session",
  express.urlencoded({ extended: false }),
  requireKioskDisplayPairingAuth,
  async (req, res, next) => {
    try {
      const kiosk = req.kioskDisplay!;
      if (kiosk.kioskCode !== paramId(req.params.kioskCode)) {
        throw new AuthenticationError();
      }
      setDisplaySessionCookie(res, kiosk);

      if (isDisplayFormBootstrapRequest(req)) {
        const displayUrl = buildKioskDisplayUrl(kiosk.kioskCode);
        if (!isAllowedDisplayRedirectUrl(displayUrl)) {
          throw new AuthenticationError();
        }
        res.redirect(302, displayUrl);
        return;
      }

      ok(res, { ok: true });
    } catch (e) {
      next(e);
    }
  }
);

kiosksRoutes.get(
  "/kiosks/:kioskCode/display-state",
  requireKioskDisplayAuth,
  async (req, res, next) => {
    try {
      const kiosk = req.kioskDisplay!;
      if (kiosk.kioskCode !== paramId(req.params.kioskCode)) {
        throw new AuthenticationError();
      }
      const state = await getKioskDisplayState(kiosk);
      ok(res, state);
    } catch (e) {
      next(e);
    }
  }
);

kiosksRoutes.get("/kiosks/:token/status", async (req, res, next) => {
  try {
    const kiosk = await resolveKiosk(paramId(req.params.token));
    if (kiosk.status !== "ACTIVE") {
      throw new NotFoundError("Kiosk not found");
    }
    ok(res, await serializeKioskServiceStatus(kiosk));
  } catch (e) {
    next(e);
  }
});

kiosksRoutes.get("/kiosks/:token", async (req, res, next) => {
  try {
    const kiosk = await resolveKiosk(paramId(req.params.token));
    if (kiosk.status !== "ACTIVE") {
      throw new NotFoundError("Kiosk not found");
    }
    ok(res, serializeKiosk(kiosk));
  } catch (e) {
    next(e);
  }
});

kiosksRoutes.delete("/kiosks/session", requireAuth, async (req, res, next) => {
  try {
    await clearUserKioskSessions(req.auth!.userId);
    ok(res, { ok: true });
  } catch (e) {
    next(e);
  }
});

kiosksRoutes.post("/kiosks/:token/session", requireAuth, async (req, res, next) => {
  try {
    const kiosk = await resolveKiosk(paramId(req.params.token));
    if (kiosk.status !== "ACTIVE") {
      throw new NotFoundError("Kiosk not found");
    }

    const expires = new Date();
    expires.setUTCHours(expires.getUTCHours() + 2);

    const now = new Date();
    await db
      .update(kioskSessions)
      .set({ expiresAt: now })
      .where(
        and(eq(kioskSessions.userId, req.auth!.userId), gt(kioskSessions.expiresAt, now))
      );

    await db.insert(kioskSessions).values({
      id: randomUUID(),
      kioskId: kiosk.id,
      userId: req.auth!.userId,
      expiresAt: expires,
    });

    await db
      .update(kiosks)
      .set({ lastSeenAt: new Date() })
      .where(eq(kiosks.id, kiosk.id));

    ok(res, {
      kiosk_code: kiosk.kioskCode,
      expires_at: expires,
    });
  } catch (e) {
    next(e);
  }
});
