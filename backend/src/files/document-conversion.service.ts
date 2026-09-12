import { ValidationError } from "../utils/errors";

/**
 * DOCX → PDF conversion pipeline hook.
 * Production should use LibreOffice headless; MVP rejects DOCX until conversion is configured.
 */
export class DocumentConversionService {
  async convertDocxToPdf(_content: Buffer): Promise<Buffer> {
    throw new ValidationError(
      "DOCX printing requires server-side conversion (not configured). Upload PDF or convert client-side."
    );
  }
}

export const documentConversionService = new DocumentConversionService();
