import { PDFDocument } from "pdf-lib";

/** Wrap a camera photo in a single-page PDF for printing. */
export async function imageFileToPdf(imageFile: File): Promise<File> {
  const bytes = await imageFile.arrayBuffer();
  const pdf = await PDFDocument.create();
  let embedded;
  const type = imageFile.type.toLowerCase();
  if (type.includes("png")) {
    embedded = await pdf.embedPng(bytes);
  } else if (type.includes("jpeg") || type.includes("jpg")) {
    embedded = await pdf.embedJpg(bytes);
  } else {
    throw new Error("Photo must be JPEG or PNG.");
  }

  const { width, height } = embedded.scale(1);
  const page = pdf.addPage([width, height]);
  page.drawImage(embedded, { x: 0, y: 0, width, height });

  const pdfBytes = await pdf.save();
  const baseName = imageFile.name.replace(/\.[^.]+$/, "") || "photo";
  const copy = new Uint8Array(pdfBytes);
  return new File([copy], `${baseName}.pdf`, { type: "application/pdf" });
}
