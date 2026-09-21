import { existsSync } from "fs";
import { describe, expect, test } from "bun:test";
import { readFile } from "fs/promises";
import { join } from "path";
import { DocumentConversionService } from "../src/files/document-conversion.service";
import { validatePdf } from "../src/files/pdf.utils";

const docxFixture = join(import.meta.dir, "fixtures", "sample.docx");
const docFixture = join(import.meta.dir, "fixtures", "sample.doc");
const xlsxFixture = join(import.meta.dir, "fixtures", "sample.xlsx");
const integrationEnabled = process.env.LIBREOFFICE_INTEGRATION === "1";

describe("DocumentConversionService integration", () => {
  test.skipIf(!integrationEnabled || !existsSync(docxFixture))(
    "converts DOCX fixture to valid PDF when LibreOffice is installed",
    async () => {
      const fixturePath = docxFixture;
      const input = await readFile(fixturePath);
      const service = new DocumentConversionService();
      const pdf = await service.convertWordToPdf(input, "docx");
      const result = await validatePdf(pdf);
      expect(result.pageCount).toBeGreaterThanOrEqual(1);
    }
  );

  test.skipIf(!integrationEnabled || !existsSync(docFixture))(
    "converts DOC fixture to valid PDF when LibreOffice is installed",
    async () => {
      const fixturePath = docFixture;
      const input = await readFile(fixturePath);
      const service = new DocumentConversionService();
      const pdf = await service.convertWordToPdf(input, "doc");
      const result = await validatePdf(pdf);
      expect(result.pageCount).toBeGreaterThanOrEqual(1);
    }
  );

  test.skipIf(!integrationEnabled || !existsSync(xlsxFixture))(
    "converts XLSX fixture to valid PDF when LibreOffice is installed",
    async () => {
      const input = await readFile(xlsxFixture);
      const service = new DocumentConversionService();
      const pdf = await service.convertOfficeToPdf(input, "xlsx");
      const result = await validatePdf(pdf);
      expect(result.pageCount).toBeGreaterThanOrEqual(1);
    }
  );
});
