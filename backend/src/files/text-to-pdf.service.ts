import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { assertTxtBuffer } from "./file-content.utils";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 50;
const FONT_SIZE = 11;
const LINE_HEIGHT = FONT_SIZE * 1.35;

function wrapLine(line: string, font: { widthOfTextAtSize: (text: string, size: number) => number }, maxWidth: number): string[] {
  if (line.length === 0) {
    return [""];
  }

  const words = line.split(/(\s+)/);
  const wrapped: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current + word;
    const width = font.widthOfTextAtSize(candidate, FONT_SIZE);
    if (width <= maxWidth || current.length === 0) {
      current = candidate;
      continue;
    }
    if (current.trim().length > 0) {
      wrapped.push(current.replace(/\s+$/, ""));
    }
    const trimmedWord = word.trimStart();
    if (trimmedWord.length === 0) {
      current = word;
      continue;
    }
    if (font.widthOfTextAtSize(trimmedWord, FONT_SIZE) <= maxWidth) {
      current = trimmedWord;
      continue;
    }
    let chunk = "";
    for (const char of trimmedWord) {
      const next = chunk + char;
      if (font.widthOfTextAtSize(next, FONT_SIZE) > maxWidth && chunk.length > 0) {
        wrapped.push(chunk);
        chunk = char;
      } else {
        chunk = next;
      }
    }
    current = chunk;
  }

  if (current.length > 0 || wrapped.length === 0) {
    wrapped.push(current.replace(/\s+$/, ""));
  }
  return wrapped;
}

export async function convertTextBufferToPdf(content: Buffer): Promise<Buffer> {
  assertTxtBuffer(content);

  const text = content.toString("utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n");

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Courier);
  const maxWidth = A4_WIDTH - MARGIN * 2;
  const maxLinesPerPage = Math.floor((A4_HEIGHT - MARGIN * 2) / LINE_HEIGHT);

  let page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  let lineOnPage = 0;

  const startNewPage = () => {
    page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    lineOnPage = 0;
  };

  for (const rawLine of lines) {
    const wrapped = wrapLine(rawLine, font, maxWidth);
    for (const visualLine of wrapped) {
      if (lineOnPage >= maxLinesPerPage) {
        startNewPage();
      }
      const y = A4_HEIGHT - MARGIN - lineOnPage * LINE_HEIGHT - FONT_SIZE;
      if (visualLine.length > 0) {
        page.drawText(visualLine, {
          x: MARGIN,
          y,
          size: FONT_SIZE,
          font,
          color: rgb(0, 0, 0),
        });
      }
      lineOnPage += 1;
    }
  }

  if (pdf.getPageCount() === 0) {
    pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  }

  return Buffer.from(await pdf.save());
}
