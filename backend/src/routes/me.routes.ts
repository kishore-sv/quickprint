import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { ensureProfile } from "../services/profile.service";
import { listUserJobs, parseListJobsQuery } from "../services/print-job.service";
import { ok } from "../utils/respond";
import { serializePrintJob } from "../utils/serializers";

export const meRoutes = Router();

meRoutes.get("/me", requireAuth, async (req, res, next) => {
  try {
    const auth = req.auth!;
    const profile = await ensureProfile(auth.userId);
    ok(res, {
      user: {
        id: auth.userId,
        name: auth.name,
        email: auth.email,
        is_anonymous: auth.isAnonymous,
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
    const options = parseListJobsQuery(req.query as Record<string, unknown>);
    const result = await listUserJobs(req.auth!.userId, options);
    ok(res, {
      items: result.items.map(serializePrintJob),
      page: result.page,
      limit: result.limit,
      has_more: result.has_more,
    });
  } catch (e) {
    next(e);
  }
});
