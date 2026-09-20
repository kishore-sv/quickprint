import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { env } from "../config/env";
import { db } from "../db";
import { printJobDocuments, savedFiles } from "../db/schema";
import { ok } from "../utils/respond";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { ensureProfile } from "../services/profile.service";
import { getStorageService } from "../storage/storage.service";
import { NotFoundError, PrintJobError, ValidationError } from "../utils/errors";
import { paramId } from "../utils/params";
import { serializeSavedFile } from "../utils/serializers";
import { wsLogger } from "../utils/logger";
import {
  buildStorageKey,
  buildStagingKey,
  processUploadBuffer,
} from "../files/process-upload.service";

export const filesRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES },
});

const initiateSchema = z.object({
  original_filename: z.string().min(1).max(512),
  content_type: z.string().min(1),
  file_size_bytes: z.number().int().min(1).max(env.MAX_UPLOAD_BYTES),
});

const completeSchema = z.object({
  original_filename: z.string().min(1).max(512).optional(),
  content_type: z.string().min(1),
});

async function saveProcessedFile(
  userId: string,
  processed: Awaited<ReturnType<typeof processUploadBuffer>>,
  saveForLater: boolean
) {
  const { fileId, storageKey } = buildStorageKey(userId, processed.storageFilename);
  const storage = getStorageService();
  await storage.upload(storageKey, processed.content, "application/pdf");

  let retentionUntil: Date | null = null;
  if (saveForLater) {
    retentionUntil = new Date();
    retentionUntil.setUTCDate(retentionUntil.getUTCDate() + 30);
  }

  const [saved] = await db
    .insert(savedFiles)
    .values({
      id: fileId,
      userId,
      storageKey,
      originalFilename: processed.originalFilename,
      fileSizeBytes: processed.uploadedSizeBytes,
      fileHash: processed.fileHash,
      pageCount: processed.pageCount,
      retentionUntil,
    })
    .returning();

  const url = await storage.getSignedUrl(storageKey, env.PREVIEW_URL_EXPIRES);
  return { saved, url };
}

filesRoutes.post("/files/initiate", requireAuth, validateBody(initiateSchema), async (req, res, next) => {
  try {
    await ensureProfile(req.auth!.userId);
    const body = req.body as z.infer<typeof initiateSchema>;
    const { fileId, stagingKey } = buildStagingKey(req.auth!.userId);
    const storage = getStorageService();
    const uploadUrl = await storage.getSignedPutUrl(stagingKey, body.content_type, 300);

    await db.insert(savedFiles).values({
      id: fileId,
      userId: req.auth!.userId,
      storageKey: stagingKey,
      originalFilename: body.original_filename,
      fileSizeBytes: body.file_size_bytes,
      fileHash: "pending",
      pageCount: 0,
      retentionUntil: null,
    });

    ok(res, {
      file_id: fileId,
      upload_url: uploadUrl,
      staging_key: stagingKey,
      expires_in: 300,
    });
  } catch (e) {
    next(e);
  }
});

filesRoutes.post(
  "/files/:id/complete",
  requireAuth,
  validateBody(completeSchema),
  async (req, res, next) => {
    try {
      await ensureProfile(req.auth!.userId);
      const fileId = paramId(req.params.id);
      const body = req.body as z.infer<typeof completeSchema>;

      const [pending] = await db
        .select()
        .from(savedFiles)
        .where(and(eq(savedFiles.id, fileId), eq(savedFiles.userId, req.auth!.userId)))
        .limit(1);
      if (!pending) throw new NotFoundError("File not found");
      if (pending.fileHash !== "pending") {
        throw new ValidationError("File already finalized");
      }

      const storage = getStorageService();
      const rawBuffer = await storage.download(pending.storageKey);
      const processed = await processUploadBuffer(
        rawBuffer,
        body.content_type,
        pending.originalFilename,
        body.original_filename ?? pending.originalFilename
      );

      const { storageKey } = buildStorageKey(req.auth!.userId, processed.storageFilename);
      await storage.upload(storageKey, processed.content, "application/pdf");
      try {
        await storage.delete(pending.storageKey);
      } catch (err) {
        wsLogger.warn({ err, stagingKey: pending.storageKey }, "failed to delete staging object");
      }

      const saveForLater = req.query.save_for_later === "true";
      let retentionUntil: Date | null = null;
      if (saveForLater) {
        retentionUntil = new Date();
        retentionUntil.setUTCDate(retentionUntil.getUTCDate() + 30);
      }

      const [saved] = await db
        .update(savedFiles)
        .set({
          storageKey,
          originalFilename: processed.originalFilename,
          fileSizeBytes: processed.uploadedSizeBytes,
          fileHash: processed.fileHash,
          pageCount: processed.pageCount,
          retentionUntil,
        })
        .where(eq(savedFiles.id, fileId))
        .returning();

      const url = await storage.getSignedUrl(storageKey, env.PREVIEW_URL_EXPIRES);
      ok(res, serializeSavedFile(saved!, url));
    } catch (e) {
      next(e);
    }
  }
);

filesRoutes.post("/files", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    await ensureProfile(req.auth!.userId);
    const file = req.file;
    if (!file) throw new ValidationError("File is required");

    const saveForLater = req.query.save_for_later === "true";
    const submittedOriginalName =
      typeof req.body?.original_filename === "string" && req.body.original_filename.trim()
        ? req.body.original_filename
        : file.originalname;

    const processed = await processUploadBuffer(
      file.buffer,
      file.mimetype,
      file.originalname,
      submittedOriginalName
    );
    const { saved, url } = await saveProcessedFile(
      req.auth!.userId,
      processed,
      saveForLater
    );
    ok(res, serializeSavedFile(saved, url));
  } catch (e) {
    next(e);
  }
});

filesRoutes.get("/files", requireAuth, async (req, res, next) => {
  try {
    const files = await db
      .select({
        id: savedFiles.id,
        originalFilename: savedFiles.originalFilename,
        fileSizeBytes: savedFiles.fileSizeBytes,
        pageCount: savedFiles.pageCount,
        retentionUntil: savedFiles.retentionUntil,
        createdAt: savedFiles.createdAt,
      })
      .from(savedFiles)
      .where(eq(savedFiles.userId, req.auth!.userId))
      .orderBy(desc(savedFiles.createdAt))
      .limit(50);
    ok(res, files.map((f) => serializeSavedFile(f, null)));
  } catch (e) {
    next(e);
  }
});

filesRoutes.get("/files/:id", requireAuth, async (req, res, next) => {
  try {
    const [saved] = await db
      .select()
      .from(savedFiles)
      .where(and(eq(savedFiles.id, paramId(req.params.id)), eq(savedFiles.userId, req.auth!.userId)))
      .limit(1);
    if (!saved) throw new NotFoundError("File not found");
    if (saved.fileHash === "pending") {
      throw new ValidationError("File upload not complete");
    }
    const storage = getStorageService();
    ok(
      res,
      serializeSavedFile(
        saved,
        await storage.getSignedUrl(saved.storageKey, env.PREVIEW_URL_EXPIRES)
      )
    );
  } catch (e) {
    next(e);
  }
});

filesRoutes.delete("/files/:id", requireAuth, async (req, res, next) => {
  try {
    const [saved] = await db
      .select()
      .from(savedFiles)
      .where(and(eq(savedFiles.id, paramId(req.params.id)), eq(savedFiles.userId, req.auth!.userId)))
      .limit(1);
    if (!saved) throw new NotFoundError("File not found");

    const [ref] = await db
      .select({ id: printJobDocuments.id })
      .from(printJobDocuments)
      .where(eq(printJobDocuments.savedFileId, saved.id))
      .limit(1);
    if (ref) {
      throw new PrintJobError("File is referenced by a print job", "FILE_IN_USE");
    }

    const storage = getStorageService();
    try {
      await storage.delete(saved.storageKey);
    } catch (err) {
      wsLogger.warn({ err, storageKey: saved.storageKey }, "storage delete failed");
    }
    await db.delete(savedFiles).where(eq(savedFiles.id, saved.id));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
