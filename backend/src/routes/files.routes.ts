import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import multer from "multer";
import { env } from "../config/env";
import { db } from "../db";
import { savedFiles } from "../db/schema";
import { documentConversionService } from "../files/document-conversion.service";
import { ok } from "../utils/respond";
import { sanitizeFilename, validatePdf, validateUploadMime } from "../files/pdf.utils";
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
    let content = file.buffer;
    let mime = "application/pdf";
    let filename = sanitizeFilename(file.originalname);

    const isDocx =
      file.mimetype.includes("wordprocessingml") || file.originalname.toLowerCase().endsWith(".docx");
    const isImage = file.mimetype.startsWith("image/");

    if (isDocx) {
      content = await documentConversionService.convertDocxToPdf(content);
      filename = sanitizeFilename(filename.replace(/\.docx$/i, ".pdf"));
    } else if (isImage) {
      throw new ValidationError("Upload PDF for printing; convert images in the client before upload");
    } else {
      mime = "application/pdf";
    }

    const { pageCount, fileHash } = await validatePdf(content);
    const fileId = randomUUID();
    const storageKey = `uploads/${req.auth!.userId}/${fileId}/${filename}`;
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
        originalFilename: filename,
        fileSizeBytes: content.length,
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
      .select()
      .from(savedFiles)
      .where(eq(savedFiles.userId, req.auth!.userId))
      .orderBy(desc(savedFiles.createdAt))
      .limit(50);
    const storage = getStorageService();
    const result = await Promise.all(
      files.map(async (f) => serializeSavedFile(f, await storage.getSignedUrl(f.storageKey)))
    );
    ok(res, result);
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
