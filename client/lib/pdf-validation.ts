/** Client-side deep PDF validation (structure + parse), not extension-based. */

export async function validatePdfFile(file: File): Promise<{ pageCount: number }> {
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const headerStr = String.fromCharCode(...header);
  if (!headerStr.startsWith("%PDF-")) {
    throw new Error("This file is not a valid PDF document.");
  }

  const tail = new Uint8Array(await file.slice(Math.max(0, file.size - 1024)).arrayBuffer());
  const tailStr = String.fromCharCode(...tail);
  if (!tailStr.includes("%%EOF")) {
    throw new Error("PDF appears incomplete or corrupted.");
  }

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
  const pageCount = doc.numPages;
  if (pageCount < 1) {
    throw new Error("PDF has no printable pages.");
  }
  return { pageCount };
}
