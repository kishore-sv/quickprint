import { createHash } from "crypto";
import pdf from "pdf-parse";
import { ValidationError } from "../utils/errors";

export function sanitizeOriginalFilename(name: string): string {
  const base = name.split("/").pop()?.split("\\").pop() ?? "document";
  const cleaned = base.replace(/[^\w.\- ]/g, "_").trim();
  return cleaned.slice(0, 200) || "document";
}

export function storagePdfFilename(originalFilename: string): string {
  const base = sanitizeOriginalFilename(originalFilename).replace(/\.[^.]+$/i, "") || "document";
  return sanitizeFilename(`${base}.pdf`);
}

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

export const SUPPORTED_FORMATS_ERROR_LABEL =
  "PDF, DOC, DOCX, XLS, XLSX, ODS, CSV, TXT, RTF, JPG, JPEG, PNG";

export const ALLOWED_UPLOAD_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.spreadsheet",
  "text/csv",
  "application/csv",
  "text/plain",
  "application/rtf",
  "text/rtf",
]);

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ods",
  ".csv",
  ".txt",
  ".rtf",
];

export function validateUploadMime(mime: string, filename: string): void {
  const lower = mime.toLowerCase();
  const ext = filename.toLowerCase();
  if (ALLOWED_UPLOAD_MIMES.has(lower)) return;
  if (ALLOWED_EXTENSIONS.some((allowed) => ext.endsWith(allowed))) {
    return;
  }
  throw new ValidationError(`Unsupported file type. Allowed: ${SUPPORTED_FORMATS_ERROR_LABEL}`);
}
