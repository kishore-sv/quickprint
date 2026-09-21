import { randomUUID } from "crypto";
import { documentConversionService } from "./document-conversion.service";
import { convertImageBufferToPdf, detectImageFormat } from "./image-to-pdf.service";
import { convertTextBufferToPdf } from "./text-to-pdf.service";
import {
  assertCsvBuffer,
  assertDocBuffer,
  assertDocxBuffer,
  assertOdsBuffer,
  assertPdfBufferHeader,
  assertRtfBuffer,
  assertTxtBuffer,
  assertXlsBuffer,
  assertXlsxBuffer,
  detectUploadKind,
  type UploadKind,
} from "./file-content.utils";
import {
  sanitizeOriginalFilename,
  storagePdfFilename,
  validatePdf,
  validateUploadMime,
} from "./pdf.utils";
import { ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";

export type ProcessedUpload = {
  content: Buffer;
  originalFilename: string;
  uploadedSizeBytes: number;
  pageCount: number;
  fileHash: string;
  storageFilename: string;
};

const EXCEL_KINDS = new Set<UploadKind>(["xls", "xlsx"]);

async function convertKindToPdf(content: Buffer, kind: UploadKind): Promise<Buffer> {
  try {
    switch (kind) {
      case "docx":
        assertDocxBuffer(content);
        return documentConversionService.convertOfficeToPdf(content, "docx");
      case "doc":
        assertDocBuffer(content);
        return documentConversionService.convertOfficeToPdf(content, "doc");
      case "xlsx":
        assertXlsxBuffer(content);
        return documentConversionService.convertOfficeToPdf(content, "xlsx");
      case "xls":
        assertXlsBuffer(content);
        return documentConversionService.convertOfficeToPdf(content, "xls");
      case "ods":
        assertOdsBuffer(content);
        return documentConversionService.convertOfficeToPdf(content, "ods");
      case "csv":
        assertCsvBuffer(content);
        return documentConversionService.convertOfficeToPdf(content, "csv");
      case "rtf":
        assertRtfBuffer(content);
        return documentConversionService.convertOfficeToPdf(content, "rtf");
      case "txt":
        assertTxtBuffer(content);
        return convertTextBufferToPdf(content);
      default:
        throw new ValidationError("Unsupported document type for conversion");
    }
  } catch (error) {
    if (error instanceof ValidationError && EXCEL_KINDS.has(kind)) {
      if (
        error.message === "Could not convert document to PDF" ||
        error.message === "Document conversion timed out" ||
        error.message === "Converted PDF is empty" ||
        error.message.startsWith("File is not a valid XLS")
      ) {
        throw new ValidationError(
          "Unable to process this Excel file. Please check that the file is valid and try again."
        );
      }
    }
    if (error instanceof ValidationError) {
      throw error;
    }
    logger.warn({ err: error, kind }, "Document conversion failed");
    if (EXCEL_KINDS.has(kind)) {
      throw new ValidationError(
        "Unable to process this Excel file. Please check that the file is valid and try again."
      );
    }
    throw new ValidationError("Could not convert document to PDF");
  }
}

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

  if (kind === "image") {
    const imageFormat = detectImageFormat(content, mimetype, displayName);
    content = await convertImageBufferToPdf(content, imageFormat);
  } else if (kind === "pdf") {
    assertPdfBufferHeader(content);
  } else {
    content = await convertKindToPdf(content, kind);
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
