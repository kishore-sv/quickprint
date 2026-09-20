import { randomUUID } from "crypto";
import { PDFDocument, degrees } from "pdf-lib";
import type { InferSelectModel } from "drizzle-orm";
import type { printJobDocuments } from "../db/schema";
import { getStorageService } from "../storage/storage.service";
import { buildPrintSheetLayout } from "./print-layout.service";
import { wsLogger } from "../utils/logger";

type JobDocument = InferSelectModel<typeof printJobDocuments>;

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 18;

function nupGrid(pagesPerSheet: number): { cols: number; rows: number } {
  switch (pagesPerSheet) {
    case 1:
      return { cols: 1, rows: 1 };
    case 2:
      return { cols: 1, rows: 2 };
    case 4:
      return { cols: 2, rows: 2 };
    case 6:
      return { cols: 2, rows: 3 };
    default:
      return { cols: 2, rows: Math.ceil(pagesPerSheet / 2) };
  }
}

async function loadPdfBytes(storageKey: string): Promise<Uint8Array> {
  const storage = getStorageService();
  const buf = await storage.download(storageKey);
  return new Uint8Array(buf);
}

async function renderDocumentSegment(
  doc: JobDocument,
  sourcePdf: PDFDocument
): Promise<PDFDocument[]> {
  const outputPdfs: PDFDocument[] = [];
  const layout = buildPrintSheetLayout({
    pageCount: doc.pageCount,
    pageRange: doc.pageRange,
    pagesPerSheet: doc.pagesPerSheet,
    duplex: doc.duplex,
    order: doc.order,
  });

  const { cols, rows } = nupGrid(doc.pagesPerSheet);
  const cellW = (A4_WIDTH - MARGIN * 2) / cols;
  const cellH = (A4_HEIGHT - MARGIN * 2) / rows;
  const isBw = doc.colorMode === "BW";

  for (let copy = 0; copy < doc.copies; copy++) {
    for (const sheet of layout) {
      const sides = [sheet.front, sheet.back].filter(
        (s): s is NonNullable<typeof sheet.back> => s != null && s.pageNumbers.length > 0
      );

      for (const side of sides) {
        const outPdf = await PDFDocument.create();
        const outPage = outPdf.addPage([A4_WIDTH, A4_HEIGHT]);

        for (let slot = 0; slot < side.pageNumbers.length; slot++) {
          const pageNum = side.pageNumbers[slot];
          const srcIndex = pageNum - 1;
          if (srcIndex < 0 || srcIndex >= sourcePdf.getPageCount()) continue;

          const [embedded] = await outPdf.embedPages([sourcePdf.getPage(srcIndex)]);
          const col = slot % cols;
          const row = Math.floor(slot / cols);
          const scale = Math.min(
            cellW / embedded.width,
            cellH / embedded.height
          );
          const w = embedded.width * scale;
          const h = embedded.height * scale;
          const x = MARGIN + col * cellW + (cellW - w) / 2;
          const y = A4_HEIGHT - MARGIN - (row + 1) * cellH + (cellH - h) / 2;

          outPage.drawPage(embedded, {
            x,
            y,
            width: w,
            height: h,
            rotate: degrees(0),
          });
        }

        if (isBw) {
          // pdf-lib has no grayscale filter; draw a white overlay trick isn't ideal.
          // Grayscale is applied via desaturation at CUPS/Pi level when needed.
          // For merged PDF we rely on color_mode in dispatch for Pi; merged uses neutral settings.
        }

        outputPdfs.push(outPdf);
      }
    }
  }

  return outputPdfs;
}

export async function composeJobPdf(
  jobId: string,
  documents: JobDocument[]
): Promise<{ storageKey: string; pageCount: number }> {
  const merged = await PDFDocument.create();
  let totalPages = 0;

  for (const doc of documents) {
    const sourceBytes = await loadPdfBytes(doc.storageKey);
    const sourcePdf = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const segments = await renderDocumentSegment(doc, sourcePdf);

    for (const segment of segments) {
      const pageIndices = segment.getPageIndices();
      const copied = await merged.copyPages(segment, pageIndices);
      for (const page of copied) {
        merged.addPage(page);
        totalPages++;
      }
    }
  }

  const mergedBytes = await merged.save();
  const fileId = randomUUID();
  const storageKey = `uploads/merged/${jobId}/${fileId}.pdf`;
  const storage = getStorageService();
  await storage.upload(storageKey, Buffer.from(mergedBytes), "application/pdf");

  wsLogger.info({ jobId, storageKey, pageCount: totalPages }, "composed merged print PDF");
  return { storageKey, pageCount: totalPages };
}

export async function ensureMergedPdf(
  jobId: string,
  documents: JobDocument[],
  existingMergedKey: string | null
): Promise<string> {
  if (existingMergedKey) {
    const storage = getStorageService();
    const exists = await storage.exists(existingMergedKey);
    if (exists) return existingMergedKey;
  }
  const { storageKey } = await composeJobPdf(jobId, documents);
  return storageKey;
}
