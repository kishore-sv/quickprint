import { randomUUID } from "crypto";
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { kioskSessions, kiosks } from "../db/schema";
import { requireAuth } from "../middleware/auth.middleware";
import { releaseReadyJobsToKiosk } from "../services/kiosk-bind.service";
import { resolveKiosk } from "../services/kiosk.service";
import { NotFoundError } from "../utils/errors";
import { paramId } from "../utils/params";
import { ok } from "../utils/respond";
import { serializeKioskServiceStatus } from "../services/kiosk-status.service";
import { serializeKiosk } from "../utils/serializers";

export const kiosksRoutes = Router();

kiosksRoutes.get("/kiosks/:token/status", async (req, res, next) => {
  try {
    const kiosk = await resolveKiosk(paramId(req.params.token));
    if (kiosk.status !== "ACTIVE") {
      throw new NotFoundError("Kiosk not found");
    }
    ok(res, serializeKioskServiceStatus(kiosk));
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

kiosksRoutes.post("/kiosks/:token/session", requireAuth, async (req, res, next) => {
  try {
    const kiosk = await resolveKiosk(paramId(req.params.token));
    if (kiosk.status !== "ACTIVE") {
      throw new NotFoundError("Kiosk not found");
    }

    const expires = new Date();
    expires.setUTCHours(expires.getUTCHours() + 2);

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

    const releasedJobIds = await releaseReadyJobsToKiosk(req.auth!.userId, kiosk.id);

    ok(res, {
      kiosk_code: kiosk.kioskCode,
      expires_at: expires,
      released_job_ids: releasedJobIds,
    });
  } catch (e) {
    next(e);
  }
});
