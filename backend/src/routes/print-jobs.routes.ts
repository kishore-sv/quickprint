import { eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db";
import { kiosks, printJobs } from "../db/schema";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import {
  addEvent,
  createPrintJob,
  deleteJobDocument,
  getJobDocuments,
  getOwnedJob,
  listUserJobs,
  parseListJobsQuery,
  recalculateJobPrice,
  updatePrintJobDocuments,
} from "../services/print-job.service";
import { validatePageRangeFormat } from "../services/pricing.service";
import { enqueueDispatchForKiosk } from "../services/kiosk-dispatch.service";
import { resolveKiosk } from "../services/kiosk.service";
import { PrintJobEventType } from "../types/enums";
import { NotFoundError, PrintJobError } from "../utils/errors";
import { ok } from "../utils/respond";
import { paramId } from "../utils/params";
import { assertActiveKioskSession } from "../services/kiosk.service";
import { applyJobTimeoutIfNeeded } from "../services/job-timeout.service";
import { isKioskServiceOnline } from "../services/kiosk-status.service";
import { cancelPrintJob } from "../services/cancellation.service";
import { retryFailedPrintJob } from "../services/retry-print-job.service";
import {
  serializePrintJob,
  serializePrintJobDetail,
  serializePrintJobDocument,
  serializePrintJobListItem,
  serializeRefund,
} from "../utils/serializers";
import {
  printJobCreateLegacySchema,
  printJobCreateSchema,
  printJobReleaseSchema,
  printJobUpdateSchema,
} from "../validators/print-job.validator";
import { ensureProfile } from "../services/profile.service";

export const printJobsRoutes = Router();

function validateDocumentsPageRanges(
  documents: { page_range: string }[]
): void {
  for (const doc of documents) {
    if (!validatePageRangeFormat(doc.page_range)) {
      throw new PrintJobError("Invalid page range format");
    }
  }
}

printJobsRoutes.post(
  "/print-jobs",
  requireAuth,
  async (req, res, next) => {
    try {
      await ensureProfile(req.auth!.userId);

      const raw = req.body as Record<string, unknown>;
      let job;

      if (Array.isArray(raw.documents)) {
        const body = printJobCreateSchema.parse(raw);
        validateDocumentsPageRanges(body.documents);
        job = await createPrintJob(req.auth!.userId, body.documents, {
          save_file: body.save_file,
        });
      } else {
        const body = printJobCreateLegacySchema.parse(raw);
        validateDocumentsPageRanges([body]);
        job = await createPrintJob(
          req.auth!.userId,
          [
            {
              saved_file_id: body.saved_file_id,
              copies: body.copies,
              page_range: body.page_range,
              color_mode: body.color_mode,
              paper_size: body.paper_size,
              duplex: body.duplex,
              pages_per_sheet: body.pages_per_sheet,
              order: body.order,
              orientation: body.orientation,
              fit_to_page: body.fit_to_page,
              save_file: body.save_file,
            },
          ],
          { save_file: body.save_file }
        );
      }

      const documents = await getJobDocuments(job.id);
      ok(res, {
        ...serializePrintJob(job),
        documents: documents.map(serializePrintJobDocument),
      });
    } catch (e) {
      next(e);
    }
  }
);

printJobsRoutes.get("/print-jobs", requireAuth, async (req, res, next) => {
  try {
    const options = parseListJobsQuery(req.query as Record<string, unknown>);
    const result = await listUserJobs(req.auth!.userId, options);
    ok(res, {
      items: result.items.map(serializePrintJobListItem),
      page: result.page,
      limit: result.limit,
      has_more: result.has_more,
    });
  } catch (e) {
    next(e);
  }
});

printJobsRoutes.get("/print-jobs/:id", requireAuth, async (req, res, next) => {
  try {
    let job = await getOwnedJob(paramId(req.params.id), req.auth!.userId);
    job = await applyJobTimeoutIfNeeded(job);
    const documents = await getJobDocuments(job.id);

    let kioskName: string | null = null;
    let kioskCode: string | null = null;
    let kioskServiceOnline: boolean | null = null;
    if (job.kioskId) {
      const [kiosk] = await db.select().from(kiosks).where(eq(kiosks.id, job.kioskId)).limit(1);
      kioskName = kiosk?.name ?? null;
      kioskCode = kiosk?.kioskCode ?? null;
      kioskServiceOnline = kiosk ? isKioskServiceOnline(kiosk) : false;
    }
    ok(res, {
      ...serializePrintJobDetail(job, { kioskName, kioskCode, kioskServiceOnline }),
      documents: documents.map(serializePrintJobDocument),
    });
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
      const body = req.body as ReturnType<typeof printJobUpdateSchema.parse>;
      validateDocumentsPageRanges(body.documents);
      const updated = await updatePrintJobDocuments(
        paramId(req.params.id),
        req.auth!.userId,
        body.documents,
        { save_file: body.save_file }
      );
      const documents = await getJobDocuments(updated.id);
      ok(res, {
        ...serializePrintJob(updated),
        documents: documents.map(serializePrintJobDocument),
      });
    } catch (e) {
      next(e);
    }
  }
);

printJobsRoutes.delete(
  "/print-jobs/:id/documents/:documentId",
  requireAuth,
  async (req, res, next) => {
    try {
      const updated = await deleteJobDocument(
        paramId(req.params.id),
        paramId(req.params.documentId),
        req.auth!.userId
      );
      const documents = await getJobDocuments(updated.id);
      ok(res, {
        ...serializePrintJob(updated),
        documents: documents.map(serializePrintJobDocument),
      });
    } catch (e) {
      next(e);
    }
  }
);

printJobsRoutes.post("/print-jobs/:id/calculate-price", requireAuth, async (req, res, next) => {
  try {
    const job = await getOwnedJob(paramId(req.params.id), req.auth!.userId);
    await recalculateJobPrice(job.id);
    const updated = await getOwnedJob(job.id, req.auth!.userId);
    ok(res, updated.pricingSnapshot);
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

      const [updated] = await db
        .update(printJobs)
        .set({
          kioskId: kiosk.id,
        })
        .where(eq(printJobs.id, job.id))
        .returning();

      await addEvent(job.id, PrintJobEventType.KIOSK_SELECTED, {
        kiosk_code: kiosk.kioskCode,
        public_token: kiosk.publicToken,
      });

      void enqueueDispatchForKiosk(kiosk.id);

      ok(res, serializePrintJob(updated!));
    } catch (e) {
      next(e);
    }
  }
);

printJobsRoutes.post("/print-jobs/:id/retry", requireAuth, async (req, res, next) => {
  try {
    const job = await retryFailedPrintJob(req.auth!.userId, paramId(req.params.id));
    const documents = await getJobDocuments(job.id);

    let kioskName: string | null = null;
    let kioskCode: string | null = null;
    let kioskServiceOnline: boolean | null = null;
    if (job.kioskId) {
      const [kiosk] = await db.select().from(kiosks).where(eq(kiosks.id, job.kioskId)).limit(1);
      kioskName = kiosk?.name ?? null;
      kioskCode = kiosk?.kioskCode ?? null;
      kioskServiceOnline = kiosk ? isKioskServiceOnline(kiosk) : false;
    }

    ok(res, {
      ...serializePrintJobDetail(job, { kioskName, kioskCode, kioskServiceOnline }),
      documents: documents.map(serializePrintJobDocument),
    });
  } catch (e) {
    next(e);
  }
});

printJobsRoutes.post("/print-jobs/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const result = await cancelPrintJob(req.auth!.userId, paramId(req.params.id));
    ok(res, {
      job: serializePrintJob(result.job, result.refund),
      refund: result.refund ? serializeRefund(result.refund) : null,
    });
  } catch (e) {
    next(e);
  }
});
