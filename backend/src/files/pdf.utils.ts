import { createHash } from "crypto";
import pdf from "pdf-parse";
import { ValidationError } from "../utils/errors";

export function sanitizeFilename(name: string): string {
  const base = name.split("/").pop()?.split("\\").pop() ?? "document";
  const cleaned = base.replace(/[^\w.\- ]/g, "_").trim();
  const withExt = cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
  return (withExt.slice(0, 200) || "document.pdf");
}

export async function validatePdf(content: Buffer): Promise<{ pageCount: number; fileHash: string }> {
  if (content.length < 8) {
    throw new ValidationError("File is too small to be a valid PDF");
  }
  if (!content.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new ValidationError("File is not a valid PDF document");
  }
  const tail = content.subarray(Math.max(0, content.length - 2048));
  if (!tail.includes(Buffer.from("%%EOF"))) {
    throw new ValidationError("PDF appears incomplete or corrupted");
  }

  const parsed = await pdf(content);
  const pageCount = parsed.numpages;
  if (pageCount < 1) {
    throw new ValidationError("PDF has no pages");
  }

  const fileHash = createHash("sha256").update(content).digest("hex");
  return { pageCount, fileHash };
}

export const ALLOWED_UPLOAD_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function validateUploadMime(mime: string, filename: string): void {
  const lower = mime.toLowerCase();
  const ext = filename.toLowerCase();
  if (ALLOWED_UPLOAD_MIMES.has(lower)) return;
  if (ext.endsWith(".pdf") || ext.endsWith(".jpg") || ext.endsWith(".jpeg") || ext.endsWith(".png") || ext.endsWith(".docx")) {
    return;
  }
  throw new ValidationError(
    "Unsupported file type. Allowed: PDF, DOCX, JPG, JPEG, PNG"
  );
}
