let pdfjsReady: Promise<typeof import("pdfjs-dist")> | null = null;

async function loadPdfJs() {
  if (!pdfjsReady) {
    pdfjsReady = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      return pdfjs;
    });
  }
  return pdfjsReady;
}

const docCache = new Map<string, Promise<import("pdfjs-dist").PDFDocumentProxy>>();

function cacheKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

async function getDocument(file: File) {
  const key = cacheKey(file);
  let pending = docCache.get(key);
  if (!pending) {
    pending = loadPdfJs().then(async (pdfjs) => {
      const data = new Uint8Array(await file.arrayBuffer());
      return pdfjs.getDocument({ data, verbosity: 0 }).promise;
    });
    docCache.set(key, pending);
  }
  return pending;
}

export type RenderPdfPageOptions = {
  /** CSS pixel width of the rendered page */
  targetWidth?: number;
  /** Fit within width + height (uses larger scale needed for object-contain) */
  maxCssWidth?: number;
  maxCssHeight?: number;
  /** PNG for sharp text; JPEG for smaller thumbnails */
  format?: "image/png" | "image/jpeg";
  jpegQuality?: number;
  maxDevicePixelRatio?: number;
};

async function renderPageToDataUrl(
  file: File,
  pageNumber: number,
  options: RenderPdfPageOptions = {}
): Promise<string> {
  const {
    targetWidth = 140,
    maxCssWidth,
    maxCssHeight,
    format = "image/png",
    jpegQuality = 0.92,
    maxDevicePixelRatio = 3,
  } = options;

  const doc = await getDocument(file);
  const page = await doc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  let cssScale = targetWidth / baseViewport.width;
  if (maxCssWidth != null && maxCssHeight != null) {
    const scaleW = maxCssWidth / baseViewport.width;
    const scaleH = maxCssHeight / baseViewport.height;
    cssScale = Math.min(scaleW, scaleH);
  }
  const viewport = page.getViewport({ scale: cssScale });

  const dpr =
    typeof window !== "undefined"
      ? Math.min(window.devicePixelRatio || 1, maxDevicePixelRatio)
      : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(dpr, dpr);

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  }).promise;

  if (format === "image/jpeg") {
    return canvas.toDataURL("image/jpeg", jpegQuality);
  }
  return canvas.toDataURL("image/png");
}

/** Small strip thumbnails in the page picker */
export async function renderPdfPageThumbnail(
  file: File,
  pageNumber: number,
  targetWidth = 120
): Promise<string> {
  return renderPageToDataUrl(file, pageNumber, {
    targetWidth,
    format: "image/jpeg",
    jpegQuality: 0.88,
  });
}

/** Full preview in zoom carousel — sized to fill the on-screen preview box */
export async function renderPdfPagePreview(
  file: File,
  pageNumber: number,
  maxCssWidth: number,
  maxCssHeight: number
): Promise<string> {
  const oversample = 2.5;
  return renderPageToDataUrl(file, pageNumber, {
    maxCssWidth: maxCssWidth * oversample,
    maxCssHeight: maxCssHeight * oversample,
    format: "image/png",
    maxDevicePixelRatio: 4,
  });
}

/** High-resolution render for sheet / N-up previews */
export async function renderPdfPageForSheet(
  file: File,
  pageNumber: number,
  targetWidth = 560
): Promise<string> {
  const oversample = 2;
  return renderPageToDataUrl(file, pageNumber, {
    targetWidth: targetWidth * oversample,
    format: "image/png",
    maxDevicePixelRatio: 4,
  });
}

export function clearPdfDocumentCache(file?: File) {
  if (!file) {
    docCache.clear();
    return;
  }
  docCache.delete(cacheKey(file));
}
