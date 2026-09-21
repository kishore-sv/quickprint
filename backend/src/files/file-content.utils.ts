import { ValidationError } from "../utils/errors";

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

function startsWith(buffer: Buffer, magic: Buffer): boolean {
  return buffer.length >= magic.length && buffer.subarray(0, magic.length).equals(magic);
}

function zipPackageText(content: Buffer): string {
  const sample = content.subarray(0, Math.min(content.length, 65536));
  return sample.toString("latin1");
}

function isOleDocMimeOrExt(lowerMime: string, lowerName: string): boolean {
  return lowerMime === "application/msword" || lowerName.endsWith(".doc");
}

function isOleXlsMimeOrExt(lowerMime: string, lowerName: string): boolean {
  return (
    lowerMime === "application/vnd.ms-excel" ||
    lowerMime === "application/excel" ||
    lowerName.endsWith(".xls")
  );
}

function assertValidUtf8Text(content: Buffer, label: string): void {
  const nulCount = content.filter((b) => b === 0).length;
  if (nulCount > 0) {
    throw new ValidationError(`File is not a valid ${label}`);
  }
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(content);
  } catch {
    throw new ValidationError(`File is not valid UTF-8 ${label}`);
  }
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

export function assertXlsBuffer(content: Buffer): void {
  if (!startsWith(content, OLE_MAGIC)) {
    throw new ValidationError("File is not a valid XLS spreadsheet");
  }
}

export function assertDocxBuffer(content: Buffer): void {
  if (!startsWith(content, ZIP_MAGIC)) {
    throw new ValidationError("File is not a valid DOCX document");
  }

  const text = zipPackageText(content);
  if (!text.includes("word/") && !text.includes("[Content_Types].xml")) {
    throw new ValidationError("File is not a valid DOCX document");
  }
}

export function assertXlsxBuffer(content: Buffer): void {
  if (!startsWith(content, ZIP_MAGIC)) {
    throw new ValidationError("File is not a valid XLSX spreadsheet");
  }

  const text = zipPackageText(content);
  if (!text.includes("xl/") && !text.includes("[Content_Types].xml")) {
    throw new ValidationError("File is not a valid XLSX spreadsheet");
  }
}

export function assertOdsBuffer(content: Buffer): void {
  if (!startsWith(content, ZIP_MAGIC)) {
    throw new ValidationError("File is not a valid ODS spreadsheet");
  }

  const text = zipPackageText(content);
  const isOds =
    text.includes("application/vnd.oasis.opendocument.spreadsheet") ||
    (text.includes("mimetype") && text.includes("spreadsheet"));
  if (!isOds && !text.includes("content.xml")) {
    throw new ValidationError("File is not a valid ODS spreadsheet");
  }
}

export function assertRtfBuffer(content: Buffer): void {
  const head = content.subarray(0, Math.min(content.length, 16)).toString("ascii");
  if (!head.startsWith("{\\rtf")) {
    throw new ValidationError("File is not a valid RTF document");
  }
}

export function assertTxtBuffer(content: Buffer): void {
  assertValidUtf8Text(content, "text file");
}

export function assertCsvBuffer(content: Buffer): void {
  assertValidUtf8Text(content, "CSV file");
}

export function assertPdfBufferHeader(content: Buffer): void {
  if (!startsWith(content, Buffer.from("%PDF-"))) {
    throw new ValidationError("File is not a valid PDF document");
  }
}

export type UploadKind =
  | "pdf"
  | "doc"
  | "docx"
  | "xls"
  | "xlsx"
  | "ods"
  | "csv"
  | "txt"
  | "rtf"
  | "image";

function detectZipKind(text: string, lowerMime: string, lowerName: string): UploadKind | null {
  if (text.includes("word/")) {
    return "docx";
  }
  if (text.includes("xl/")) {
    return "xlsx";
  }
  if (
    text.includes("application/vnd.oasis.opendocument.spreadsheet") ||
    (text.includes("mimetype") && lowerName.endsWith(".ods"))
  ) {
    return "ods";
  }
  if (lowerMime.includes("wordprocessingml") || lowerName.endsWith(".docx")) {
    return "docx";
  }
  if (
    lowerMime.includes("spreadsheetml") ||
    lowerMime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    lowerName.endsWith(".xlsx")
  ) {
    return "xlsx";
  }
  if (lowerMime.includes("opendocument.spreadsheet") || lowerName.endsWith(".ods")) {
    return "ods";
  }
  return null;
}

/** Classify upload from bytes and multipart file metadata (not display original_filename). */
export function detectUploadKind(mimetype: string, filename: string, content: Buffer): UploadKind {
  if (content.length >= 5 && content.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    return "pdf";
  }

  const lowerMime = mimetype.toLowerCase();
  const lowerName = filename.toLowerCase();

  if (startsWith(content, ZIP_MAGIC)) {
    const zipKind = detectZipKind(zipPackageText(content), lowerMime, lowerName);
    if (zipKind) {
      return zipKind;
    }
  }

  const rtfHead = content.subarray(0, Math.min(content.length, 16)).toString("ascii");
  if (rtfHead.startsWith("{\\rtf")) {
    return "rtf";
  }
  if (
    lowerMime === "application/rtf" ||
    lowerMime === "text/rtf" ||
    lowerName.endsWith(".rtf")
  ) {
    return "rtf";
  }

  if (startsWith(content, OLE_MAGIC)) {
    if (isOleXlsMimeOrExt(lowerMime, lowerName)) {
      return "xls";
    }
    if (isOleDocMimeOrExt(lowerMime, lowerName)) {
      return "doc";
    }
    throw new ValidationError("Unrecognized legacy Office document format");
  }

  if (lowerMime === "text/csv" || lowerMime === "application/csv" || lowerName.endsWith(".csv")) {
    return "csv";
  }
  if (lowerMime === "text/plain" || lowerName.endsWith(".txt")) {
    return "txt";
  }

  if (lowerMime.includes("wordprocessingml") || lowerName.endsWith(".docx")) {
    return "docx";
  }
  if (lowerMime === "application/msword" || lowerName.endsWith(".doc")) {
    return "doc";
  }
  if (
    lowerMime.includes("spreadsheetml") ||
    lowerMime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    lowerName.endsWith(".xlsx")
  ) {
    return "xlsx";
  }
  if (lowerMime === "application/vnd.ms-excel" || lowerName.endsWith(".xls")) {
    return "xls";
  }
  if (lowerMime.includes("opendocument.spreadsheet") || lowerName.endsWith(".ods")) {
    return "ods";
  }

  if (lowerMime.startsWith("image/") || /\.(jpe?g|png)$/.test(lowerName)) {
    return "image";
  }
  return "pdf";
}
