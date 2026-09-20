import { randomUUID } from "crypto";
import { documentConversionService } from "./document-conversion.service";
import { convertImageBufferToPdf, detectImageFormat } from "./image-to-pdf.service";
import {
  assertDocBuffer,
  assertDocxBuffer,
  assertPdfBufferHeader,
  detectUploadKind,
} from "./file-content.utils";
import {
  sanitizeOriginalFilename,
  storagePdfFilename,
  validatePdf,
  validateUploadMime,
} from "./pdf.utils";

export type ProcessedUpload = {
  content: Buffer;
  originalFilename: string;
  uploadedSizeBytes: number;
  pageCount: number;
  fileHash: string;
  storageFilename: string;
};

export async function processUploadBuffer(
  buffer: Buffer,
  mimetype: string,
  originalName: string,
  submittedOriginalName?: string
): Promise<ProcessedUpload> {
  validateUploadMime(mimetype, originalName);
  const displayName = submittedOriginalName?.trim() || originalName;
  const originalFilename = sanitizeOriginalFilename(displayName);
  const uploadedSizeBytes = buffer.length;

  let content = buffer;
  const storageFilename = storagePdfFilename(originalFilename);
  const kind = detectUploadKind(mimetype, originalName, content);

  if (kind === "docx") {
    assertDocxBuffer(content);
    content = await documentConversionService.convertWordToPdf(content, "docx");
  } else if (kind === "doc") {
    assertDocBuffer(content);
    content = await documentConversionService.convertWordToPdf(content, "doc");
  } else if (kind === "image") {
    const imageFormat = detectImageFormat(content, mimetype, displayName);
    content = await convertImageBufferToPdf(content, imageFormat);
  } else {
    assertPdfBufferHeader(content);
  }

  const { pageCount, fileHash } = await validatePdf(content);
  return {
    content,
    originalFilename,
    uploadedSizeBytes,
    pageCount,
    fileHash,
    storageFilename,
  };
}

export function buildStorageKey(userId: string, storageFilename: string): {
  fileId: string;
  storageKey: string;
} {
  const fileId = randomUUID();
  const storageKey = `uploads/${userId}/${fileId}/${storageFilename}`;
  return { fileId, storageKey };
}

export function buildStagingKey(userId: string): {
  fileId: string;
  stagingKey: string;
} {
  const fileId = randomUUID();
  const stagingKey = `uploads/${userId}/${fileId}/staging`;
  return { fileId, stagingKey };
}
