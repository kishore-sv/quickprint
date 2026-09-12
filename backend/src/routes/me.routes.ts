import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";
import { requireAuth } from "../middleware/auth.middleware";
import { ensureProfile } from "../services/profile.service";
import { listUserJobs } from "../services/print-job.service";
import { ok } from "../utils/respond";
import { serializePrintJob } from "../utils/serializers";
import { AuthenticationError } from "../utils/errors";

export const meRoutes = Router();

meRoutes.get("/me", requireAuth, async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session?.user) throw new AuthenticationError();
    const profile = await ensureProfile(session.user.id);
    ok(res, {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        is_anonymous: session.user.isAnonymous,
      },
      profile: {
        id: profile.id,
        display_name: profile.displayName,
      },
    });
  } catch (e) {
    next(e);
  }
});

meRoutes.get("/me/print-jobs", requireAuth, async (req, res, next) => {
  try {
    const jobs = await listUserJobs(req.auth!.userId);
    ok(res, jobs.map(serializePrintJob));
  } catch (e) {
    next(e);
  }
});
