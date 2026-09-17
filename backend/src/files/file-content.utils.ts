import { ValidationError } from "../utils/errors";

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

function startsWith(buffer: Buffer, magic: Buffer): boolean {
  return buffer.length >= magic.length && buffer.subarray(0, magic.length).equals(magic);
}

export function assertJpegBuffer(content: Buffer): void {
  if (!startsWith(content, JPEG_MAGIC)) {
    throw new ValidationError("File is not a valid JPEG image");
  }
}

export function assertPngBuffer(content: Buffer): void {
  if (!startsWith(content, PNG_MAGIC)) {
    throw new ValidationError("File is not a valid PNG image");
  }
}

export function assertDocBuffer(content: Buffer): void {
  if (!startsWith(content, OLE_MAGIC)) {
    throw new ValidationError("File is not a valid DOC document");
  }
}

export function assertDocxBuffer(content: Buffer): void {
  if (!startsWith(content, ZIP_MAGIC)) {
    throw new ValidationError("File is not a valid DOCX document");
  }

  const text = content.toString("latin1");
  if (!text.includes("word/") && !text.includes("[Content_Types].xml")) {
    throw new ValidationError("File is not a valid DOCX document");
  }
}

export function assertPdfBufferHeader(content: Buffer): void {
  if (!startsWith(content, Buffer.from("%PDF-"))) {
    throw new ValidationError("File is not a valid PDF document");
  }
}

export type UploadKind = "pdf" | "doc" | "docx" | "image";

/** Classify upload from bytes and multipart file metadata (not display original_filename). */
export function detectUploadKind(mimetype: string, filename: string, content: Buffer): UploadKind {
  if (content.length >= 5 && content.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    return "pdf";
  }

  const lowerMime = mimetype.toLowerCase();
  const lowerName = filename.toLowerCase();

  if (lowerMime.includes("wordprocessingml") || lowerName.endsWith(".docx")) {
    return "docx";
  }
  if (lowerMime === "application/msword" || lowerName.endsWith(".doc")) {
    return "doc";
  }
  if (lowerMime.startsWith("image/") || /\.(jpe?g|png)$/.test(lowerName)) {
    return "image";
  }
  return "pdf";
}
