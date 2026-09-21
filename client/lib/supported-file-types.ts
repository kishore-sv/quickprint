import type { Accept } from "react-dropzone";

export const SUPPORTED_FORMATS_LABEL =
  "PDF, DOC, DOCX, XLS, XLSX, ODS, CSV, TXT, RTF, JPG, PNG";

export const UNSUPPORTED_FILE_MESSAGE = `Unsupported file type. Supported formats: ${SUPPORTED_FORMATS_LABEL}.`;

export const SUPPORTED_FILE_ACCEPT: Accept = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.oasis.opendocument.spreadsheet": [".ods"],
  "text/csv": [".csv"],
  "application/csv": [".csv"],
  "text/plain": [".txt"],
  "application/rtf": [".rtf"],
  "text/rtf": [".rtf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

const WORD_EXTENSIONS = [".doc", ".docx"];
const SPREADSHEET_EXTENSIONS = [".xls", ".xlsx", ".ods", ".csv"];
const TEXT_EXTENSIONS = [".txt", ".rtf"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];
const PDF_EXTENSIONS = [".pdf"];

function extensionOf(filename: string): string {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot) : "";
}

function mimeOf(file: File): string {
  return file.type.toLowerCase();
}

export function isPdf(file: File): boolean {
  const mime = mimeOf(file);
  const ext = extensionOf(file.name);
  return mime === "application/pdf" || PDF_EXTENSIONS.includes(ext);
}

export function isWordDocument(file: File): boolean {
  const mime = mimeOf(file);
  const ext = extensionOf(file.name);
  return (
    mime === "application/msword" ||
    mime.includes("wordprocessingml") ||
    WORD_EXTENSIONS.includes(ext)
  );
}

export function isSpreadsheetUpload(file: File): boolean {
  const mime = mimeOf(file);
  const ext = extensionOf(file.name);
  return (
    mime === "application/vnd.ms-excel" ||
    mime === "application/excel" ||
    mime.includes("spreadsheetml") ||
    mime.includes("opendocument.spreadsheet") ||
    mime === "text/csv" ||
    mime === "application/csv" ||
    SPREADSHEET_EXTENSIONS.includes(ext)
  );
}

export function isTextDocumentUpload(file: File): boolean {
  const mime = mimeOf(file);
  const ext = extensionOf(file.name);
  return (
    mime === "text/plain" ||
    mime === "application/rtf" ||
    mime === "text/rtf" ||
    TEXT_EXTENSIONS.includes(ext)
  );
}

/** Uploads normalized to PDF on the server (skip client PDF validation until after upload). */
export function isServerConvertedUpload(file: File): boolean {
  return isWordDocument(file) || isSpreadsheetUpload(file) || isTextDocumentUpload(file);
}

export function isSupportedImage(file: File): boolean {
  const mime = mimeOf(file);
  const ext = extensionOf(file.name);
  return mime === "image/jpeg" || mime === "image/jpg" || mime === "image/png" || IMAGE_EXTENSIONS.includes(ext);
}

export function isSupportedUploadFile(file: File): boolean {
  return (
    isPdf(file) ||
    isWordDocument(file) ||
    isSpreadsheetUpload(file) ||
    isTextDocumentUpload(file) ||
    isSupportedImage(file)
  );
}

export function getUnsupportedFileMessage(): string {
  return UNSUPPORTED_FILE_MESSAGE;
}
