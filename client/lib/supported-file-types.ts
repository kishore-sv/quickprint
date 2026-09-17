import type { Accept } from "react-dropzone";

export const SUPPORTED_FORMATS_LABEL = "PDF, DOC, DOCX, JPG, PNG";

export const UNSUPPORTED_FILE_MESSAGE = `Unsupported file type. Supported formats: ${SUPPORTED_FORMATS_LABEL}.`;

export const SUPPORTED_FILE_ACCEPT: Accept = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

const WORD_EXTENSIONS = [".doc", ".docx"];
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

export function isSupportedImage(file: File): boolean {
  const mime = mimeOf(file);
  const ext = extensionOf(file.name);
  return mime === "image/jpeg" || mime === "image/jpg" || mime === "image/png" || IMAGE_EXTENSIONS.includes(ext);
}

export function isSupportedUploadFile(file: File): boolean {
  return isPdf(file) || isWordDocument(file) || isSupportedImage(file);
}

export function getUnsupportedFileMessage(): string {
  return UNSUPPORTED_FILE_MESSAGE;
}
