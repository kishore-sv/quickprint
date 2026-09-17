import { PDFDocument } from "pdf-lib";
import { assertJpegBuffer, assertPngBuffer } from "./file-content.utils";

export type ImageFormat = "jpeg" | "png";

export async function convertImageBufferToPdf(content: Buffer, format: ImageFormat): Promise<Buffer> {
  if (format === "png") {
    assertPngBuffer(content);
  } else {
    assertJpegBuffer(content);
  }

  const pdf = await PDFDocument.create();
  const embedded =
    format === "png" ? await pdf.embedPng(content) : await pdf.embedJpg(content);
  const { width, height } = embedded.scale(1);
  const page = pdf.addPage([width, height]);
  page.drawImage(embedded, { x: 0, y: 0, width, height });
  return Buffer.from(await pdf.save());
}

export function detectImageFormat(content: Buffer, mimetype: string, filename: string): ImageFormat {
  const lowerMime = mimetype.toLowerCase();
  const lowerName = filename.toLowerCase();
  if (lowerMime.includes("png") || lowerName.endsWith(".png")) {
    return "png";
  }
  return "jpeg";
}
