import { Router } from "express";
import { requireAdmin } from "../middleware/auth.middleware";
import { ok } from "../utils/respond";
import { parseDateRange, parsePagination } from "../utils/admin-pagination";
import { getAdminDashboard } from "../services/admin/dashboard.service";
import {
  archiveAdminKiosk,
  createAdminKiosk,
  getAdminKioskById,
  listAdminKiosks,
  restoreAdminKiosk,
  revealAdminKioskProvisioning,
} from "../services/admin/kiosks.service";
import {
  getAdminPrintJobById,
  listAdminPrintJobs,
} from "../services/admin/print-jobs.service";
import { listAdminPayments, getAdminPaymentById } from "../services/admin/payments.service";
import { listAdminRefunds, getAdminRefundById } from "../services/admin/refunds.service";
import { listAdminUsers, getAdminUserById } from "../services/admin/users.service";
import { listAdminPrinters } from "../services/admin/printers.service";
import {
  getOperationalLogById,
  listOperationalLogs,
  serializeOperationalLog,
} from "../services/operational-log.service";
import { getPrintUsageAnalytics } from "../services/admin/analytics.service";
import { getAdminSettings, updateAdminPricing } from "../services/admin/settings.service";
import { NotFoundError } from "../utils/errors";

export const adminRoutes = Router();

adminRoutes.use(requireAdmin);

adminRoutes.get("/dashboard", async (_req, res, next) => {
  try {
    ok(res, await getAdminDashboard());
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/kiosks", async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const status = req.query.status ? String(req.query.status) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    ok(res, await listAdminKiosks({ page, limit, status: status as any, search }));
  } catch (e) {
    next(e);
  }
});

adminRoutes.post("/kiosks", async (req, res, next) => {
  try {
    const body = req.body as {
      kiosk_code?: string;
      display_name?: string;
      location?: string;
      description?: string;
    };
    ok(
      res,
      await createAdminKiosk(
        {
          kiosk_code: body.kiosk_code ?? "",
          display_name: body.display_name ?? "",
          location: body.location,
          description: body.description,
        },
        req.auth!.userId
      ),
      201
    );
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/kiosks/:id", async (req, res, next) => {
  try {
    const kiosk = await getAdminKioskById(req.params.id);
    if (!kiosk) throw new NotFoundError("Kiosk not found");
    ok(res, kiosk);
  } catch (e) {
    next(e);
  }
});

adminRoutes.post("/kiosks/:id/archive", async (req, res, next) => {
  try {
    ok(res, await archiveAdminKiosk(req.params.id, req.auth!.userId));
  } catch (e) {
    next(e);
  }
});

adminRoutes.post("/kiosks/:id/restore", async (req, res, next) => {
  try {
    ok(res, await restoreAdminKiosk(req.params.id, req.auth!.userId));
  } catch (e) {
    next(e);
  }
});

adminRoutes.post("/kiosks/:id/provisioning/reveal", async (req, res, next) => {
  try {
    ok(res, await revealAdminKioskProvisioning(req.params.id, req.auth!.userId));
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/kiosks/:id/print-jobs", async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    ok(res, await listAdminPrintJobs({ page, limit, kioskId: req.params.id }));
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/kiosks/:id/logs", async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const result = await listOperationalLogs({ page, limit, kioskId: req.params.id });
    ok(res, {
      ...result,
      items: result.items.map(serializeOperationalLog),
    });
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/print-jobs", async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const { from, to } = parseDateRange(req.query as Record<string, unknown>);
    ok(
      res,
      await listAdminPrintJobs({
        page,
        limit,
        search: req.query.search ? String(req.query.search) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        kioskId: req.query.kiosk_id ? String(req.query.kiosk_id) : undefined,
        from,
        to,
      })
    );
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/print-jobs/:id", async (req, res, next) => {
  try {
    const job = await getAdminPrintJobById(req.params.id);
    if (!job) throw new NotFoundError("Print job not found");
    ok(res, job);
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/payments", async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const { from, to } = parseDateRange(req.query as Record<string, unknown>);
    ok(
      res,
      await listAdminPayments({
        page,
        limit,
        search: req.query.search ? String(req.query.search) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        from,
        to,
      })
    );
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/payments/:id", async (req, res, next) => {
  try {
    ok(res, await getAdminPaymentById(req.params.id));
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/refunds", async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const { from, to } = parseDateRange(req.query as Record<string, unknown>);
    ok(
      res,
      await listAdminRefunds({
        page,
        limit,
        search: req.query.search ? String(req.query.search) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        from,
        to,
      })
    );
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/refunds/:id", async (req, res, next) => {
  try {
    ok(res, await getAdminRefundById(req.params.id));
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/users", async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    ok(
      res,
      await listAdminUsers({
        page,
        limit,
        search: req.query.search ? String(req.query.search) : undefined,
      })
    );
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/users/:id", async (req, res, next) => {
  try {
    ok(res, await getAdminUserById(req.params.id));
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/printers", async (_req, res, next) => {
  try {
    ok(res, await listAdminPrinters());
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/logs", async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const { from, to } = parseDateRange(req.query as Record<string, unknown>);
    const result = await listOperationalLogs({
      page,
      limit,
      search: req.query.search ? String(req.query.search) : undefined,
      level: req.query.level ? (String(req.query.level) as "INFO" | "WARNING" | "ERROR") : undefined,
      event: req.query.event ? String(req.query.event) : undefined,
      kioskId: req.query.kiosk_id ? String(req.query.kiosk_id) : undefined,
      resourceType: req.query.resource_type ? String(req.query.resource_type) : undefined,
      from,
      to,
    });
    ok(res, { ...result, items: result.items.map(serializeOperationalLog) });
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/logs/:id", async (req, res, next) => {
  try {
    const log = await getOperationalLogById(req.params.id);
    if (!log) throw new NotFoundError("Log not found");
    ok(res, serializeOperationalLog(log));
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/analytics/print-usage", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req.query as Record<string, unknown>);
    const range = (req.query.range ? String(req.query.range) : "7d") as
      | "today"
      | "yesterday"
      | "7d"
      | "30d"
      | "custom";
    const colorMode = req.query.color_mode
      ? (String(req.query.color_mode) as "BW" | "COLOR" | "all")
      : "all";
    ok(
      res,
      await getPrintUsageAnalytics({
        range,
        from,
        to,
        kioskId: req.query.kiosk_id ? String(req.query.kiosk_id) : undefined,
        colorMode,
      })
    );
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/settings", async (_req, res, next) => {
  try {
    ok(res, await getAdminSettings());
  } catch (e) {
    next(e);
  }
});

adminRoutes.patch("/settings/pricing", async (req, res, next) => {
  try {
    const body = req.body as { bw_per_sheet_paise?: number; color_per_sheet_paise?: number };
    ok(
      res,
      await updateAdminPricing(
        {
          bw_per_sheet_paise: body.bw_per_sheet_paise ?? 0,
          color_per_sheet_paise: body.color_per_sheet_paise ?? 0,
        },
        req.auth!.userId
      )
    );
  } catch (e) {
    next(e);
  }
});
