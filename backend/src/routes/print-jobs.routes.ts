import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db";
import { savedFiles } from "../db/schema";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import {
  addEvent,
  applyRetention,
  createPrintJob,
  getOwnedJob,
  listUserJobs,
  recalculateJobPrice,
} from "../services/print-job.service";
import { buildPriceBreakdown, getActiveRates, validatePageRangeFormat } from "../services/pricing.service";
import { resolveKiosk } from "../services/kiosk.service";
import { PrintJobEventType } from "../types/enums";
import { NotFoundError, PrintJobError } from "../utils/errors";
import { ok } from "../utils/respond";
import { paramId } from "../utils/params";
import { assertActiveKioskSession } from "../services/kiosk.service";
import { serializePrintJob } from "../utils/serializers";
import {
  printJobCreateSchema,
  printJobReleaseSchema,
  printJobUpdateSchema,
} from "../validators/print-job.validator";
import { ensureProfile } from "../services/profile.service";
import { printJobs } from "../db/schema";

export const printJobsRoutes = Router();

printJobsRoutes.post(
  "/print-jobs",
  requireAuth,
  validateBody(printJobCreateSchema),
  async (req, res, next) => {
    try {
      await ensureProfile(req.auth!.userId);
      const body = req.body as ReturnType<typeof printJobCreateSchema.parse>;

      if (!validatePageRangeFormat(body.page_range)) {
        throw new PrintJobError("Invalid page range format");
      }

      const [saved] = await db
        .select()
        .from(savedFiles)
        .where(
          and(eq(savedFiles.id, body.saved_file_id), eq(savedFiles.userId, req.auth!.userId))
        )
        .limit(1);
      if (!saved) throw new NotFoundError("File not found");

      const job = await createPrintJob(req.auth!.userId, {
        id: saved.id,
        originalFilename: saved.originalFilename,
        storageKey: saved.storageKey,
        fileSizeBytes: saved.fileSizeBytes,
        fileHash: saved.fileHash,
        pageCount: saved.pageCount,
      }, body);

      if (body.save_file && !saved.retentionUntil) {
        const retention = applyRetention(true);
        await db
          .update(savedFiles)
          .set({ retentionUntil: retention.fileRetentionUntil })
          .where(eq(savedFiles.id, saved.id));
      }

      ok(res, serializePrintJob(job));
    } catch (e) {
      next(e);
    }
  }
);

printJobsRoutes.get("/print-jobs", requireAuth, async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const jobs = await listUserJobs(req.auth!.userId, status as import("../types/enums").PrintJobStatus | undefined);
    ok(res, jobs.map(serializePrintJob));
  } catch (e) {
    next(e);
  }
});

printJobsRoutes.get("/print-jobs/:id", requireAuth, async (req, res, next) => {
  try {
    const job = await getOwnedJob(paramId(req.params.id), req.auth!.userId);
    ok(res, serializePrintJob(job));
  } catch (e) {
    next(e);
  }
});

printJobsRoutes.patch(
  "/print-jobs/:id",
  requireAuth,
  validateBody(printJobUpdateSchema),
  async (req, res, next) => {
    try {
      const job = await getOwnedJob(paramId(req.params.id), req.auth!.userId);
      if (job.paymentStatus === "PAID") {
        throw new PrintJobError("Cannot edit paid job");
      }
      const body = req.body as ReturnType<typeof printJobUpdateSchema.parse>;
      if (!validatePageRangeFormat(body.page_range)) {
        throw new PrintJobError("Invalid page range format");
      }
      if (body.color_mode !== "BW") {
        throw new PrintJobError("Color printing not enabled");
      }

      const retention = applyRetention(body.save_file);
      await db
        .update(printJobs)
        .set({
          copies: body.copies,
          pageRange: body.page_range,
          colorMode: body.color_mode,
          paperSize: body.paper_size,
          duplex: body.duplex,
          pagesPerSheet: body.pages_per_sheet,
          order: body.order,
          orientation: body.orientation,
          fitToPage: body.fit_to_page,
          saveFile: retention.saveFile,
          fileRetentionUntil: retention.fileRetentionUntil,
        })
        .where(eq(printJobs.id, job.id));

      await recalculateJobPrice(job.id);
      const updated = await getOwnedJob(job.id, req.auth!.userId);
      ok(res, serializePrintJob(updated));
    } catch (e) {
      next(e);
    }
  }
);

printJobsRoutes.post("/print-jobs/:id/calculate-price", requireAuth, async (req, res, next) => {
  try {
    const job = await getOwnedJob(paramId(req.params.id), req.auth!.userId);
    const rates = await getActiveRates();
    const breakdown = buildPriceBreakdown({
      pageCount: job.pageCount,
      pageRange: job.pageRange,
      pagesPerSheet: job.pagesPerSheet,
      duplex: job.duplex,
      copies: job.copies,
      colorMode: job.colorMode,
      bwPaise: rates.bwPaise,
      colorPaise: rates.colorPaise,
      currency: rates.currency,
    });
    await db
      .update(printJobs)
      .set({
        physicalSheets: breakdown.physical_sheets,
        amountPaise: breakdown.total_paise,
        currency: breakdown.currency,
        pricingSnapshot: breakdown,
      })
      .where(eq(printJobs.id, job.id));
    ok(res, breakdown);
  } catch (e) {
    next(e);
  }
});

printJobsRoutes.post(
  "/print-jobs/:id/release",
  requireAuth,
  validateBody(printJobReleaseSchema),
  async (req, res, next) => {
    try {
      const job = await getOwnedJob(paramId(req.params.id), req.auth!.userId);
      if (job.paymentStatus !== "PAID") {
        throw new PrintJobError("Job is not paid", "JOB_NOT_PRINTABLE");
      }
      if (!["PAID", "QUEUED"].includes(job.status)) {
        throw new PrintJobError("Job cannot be released", "JOB_NOT_PRINTABLE");
      }
      if (job.status === "CLAIMED" && job.kioskId) {
        throw new PrintJobError("Job already claimed");
      }

      const kiosk = await resolveKiosk(req.body.kiosk_code);
      if (kiosk.status !== "ACTIVE") {
        throw new NotFoundError("Kiosk not found");
      }
      await assertActiveKioskSession(req.auth!.userId, kiosk.id);

      const now = new Date();
      const [updated] = await db
        .update(printJobs)
        .set({
          kioskId: kiosk.id,
          status: "CLAIMED",
          claimedAt: now,
        })
        .where(eq(printJobs.id, job.id))
        .returning();

      await addEvent(job.id, PrintJobEventType.KIOSK_SELECTED, {
        kiosk_code: kiosk.kioskCode,
        public_token: kiosk.publicToken,
      });
      await addEvent(job.id, PrintJobEventType.PRINT_REQUESTED);

      ok(res, serializePrintJob(updated!));
    } catch (e) {
      next(e);
    }
  }
);

printJobsRoutes.post("/print-jobs/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const job = await getOwnedJob(paramId(req.params.id), req.auth!.userId);
    if (job.paymentStatus === "PAID") {
      throw new PrintJobError("Cannot cancel a paid job");
    }
    if (!["CREATED", "PAYMENT_PENDING", "QUEUED"].includes(job.status)) {
      throw new PrintJobError("Job cannot be cancelled");
    }
    const [updated] = await db
      .update(printJobs)
      .set({ status: "CANCELLED" })
      .where(eq(printJobs.id, job.id))
      .returning();
    await addEvent(job.id, PrintJobEventType.CANCELLED);
    ok(res, serializePrintJob(updated!));
  } catch (e) {
    next(e);
  }
});
