import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import multer from "multer";
import { env } from "../config/env";
import { db } from "../db";
import { savedFiles } from "../db/schema";
import { documentConversionService } from "../files/document-conversion.service";
import { convertImageBufferToPdf, detectImageFormat } from "../files/image-to-pdf.service";
import {
  assertDocBuffer,
  assertDocxBuffer,
  assertPdfBufferHeader,
  detectUploadKind,
} from "../files/file-content.utils";
import { ok } from "../utils/respond";
import {
  sanitizeOriginalFilename,
  storagePdfFilename,
  validatePdf,
  validateUploadMime,
} from "../files/pdf.utils";
import { requireAuth } from "../middleware/auth.middleware";
import { ensureProfile } from "../services/profile.service";
import { getStorageService } from "../storage/storage.service";
import { NotFoundError, ValidationError } from "../utils/errors";
import { paramId } from "../utils/params";
import { serializeSavedFile } from "../utils/serializers";

export const filesRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES },
});

filesRoutes.post("/files", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    await ensureProfile(req.auth!.userId);
    const file = req.file;
    if (!file) throw new ValidationError("File is required");

    validateUploadMime(file.mimetype, file.originalname);

    const saveForLater = req.query.save_for_later === "true";
    const submittedOriginalName =
      typeof req.body?.original_filename === "string" && req.body.original_filename.trim()
        ? req.body.original_filename
        : file.originalname;
    const originalFilename = sanitizeOriginalFilename(submittedOriginalName);
    const uploadedSizeBytes = file.buffer.length;

    let content = file.buffer;
    const mime = "application/pdf";
    const storageFilename = storagePdfFilename(originalFilename);
    // Classify from uploaded bytes/name only — original_filename is display metadata.
    const kind = detectUploadKind(file.mimetype, file.originalname, content);

    if (kind === "docx") {
      assertDocxBuffer(content);
      content = await documentConversionService.convertWordToPdf(content, "docx");
    } else if (kind === "doc") {
      assertDocBuffer(content);
      content = await documentConversionService.convertWordToPdf(content, "doc");
    } else if (kind === "image") {
      const imageFormat = detectImageFormat(content, file.mimetype, submittedOriginalName);
      content = await convertImageBufferToPdf(content, imageFormat);
    } else {
      assertPdfBufferHeader(content);
    }

    const { pageCount, fileHash } = await validatePdf(content);
    const fileId = randomUUID();
    const storageKey = `uploads/${req.auth!.userId}/${fileId}/${storageFilename}`;
    const storage = getStorageService();
    await storage.upload(storageKey, content, mime);

    let retentionUntil: Date | null = null;
    if (saveForLater) {
      retentionUntil = new Date();
      retentionUntil.setUTCDate(retentionUntil.getUTCDate() + 30);
    }

    const [saved] = await db
      .insert(savedFiles)
      .values({
        id: fileId,
        userId: req.auth!.userId,
        storageKey,
        originalFilename,
        fileSizeBytes: uploadedSizeBytes,
        fileHash,
        pageCount,
        retentionUntil,
      })
      .returning();

    const url = await storage.getSignedUrl(storageKey);
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
    const storage = getStorageService();
    ok(res, serializeSavedFile(saved, await storage.getSignedUrl(saved.storageKey)));
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
    const storage = getStorageService();
    try {
      await storage.delete(saved.storageKey);
    } catch {
      /* ignore */
    }
    await db.delete(savedFiles).where(eq(savedFiles.id, saved.id));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
