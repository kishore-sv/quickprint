"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { buildPrintSheetLayout } from "@/lib/print-layout";
import { renderPdfPageForSheet, renderPdfPageThumbnail } from "@/lib/pdf-page-thumbnails";
import type { PrintSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

type PrintSheetPreviewProps = {
  file: File;
  pageCount: number;
  pageRange: string;
  settings: Pick<
    PrintSettings,
    "pages_per_sheet" | "duplex" | "order" | "color_mode"
  >;
  sheetIndex: number;
  side: "front" | "back";
  className?: string;
  /** Use high-DPI PNG renders for modal / full preview */
  highQuality?: boolean;
};

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

export function PrintSheetPreview({
  file,
  pageCount,
  pageRange,
  settings,
  sheetIndex,
  side,
  className,
  highQuality = false,
}: PrintSheetPreviewProps) {
  const layout = useMemo(
    () =>
      buildPrintSheetLayout({
        pageCount,
        pageRange,
        pagesPerSheet: settings.pages_per_sheet,
        duplex: settings.duplex,
        order: settings.order,
      }),
    [pageCount, pageRange, settings]
  );

  const sheet = layout[sheetIndex];
  const pageNumbers =
    side === "front" ? sheet?.front.pageNumbers ?? [] : sheet?.back?.pageNumbers ?? [];
  const { cols, rows } = nupGrid(settings.pages_per_sheet);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageKey = pageNumbers.join(",");

  useEffect(() => {
    if (pageNumbers.length === 0) {
      setLoading(false);
      setThumbs({});
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const next: Record<number, string> = {};
        const renderPage = highQuality ? renderPdfPageForSheet : renderPdfPageThumbnail;
        const width = highQuality ? 400 : 200;
        for (const p of pageNumbers) {
          if (cancelled) return;
          next[p] = await renderPage(file, p, width);
        }
        if (!cancelled) {
          setThumbs(next);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Preview failed");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, pageKey, highQuality]);

  if (!sheet) {
    return (
      <div className={cn("flex aspect-[210/297] items-center justify-center bg-muted/30", className)}>
        <span className="text-muted-foreground text-xs">No sheet</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex aspect-[210/297] items-center justify-center bg-muted/30 p-3", className)}>
        <span className="text-center text-muted-foreground text-xs">{error}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative aspect-[210/297] overflow-hidden rounded-sm border border-dashed border-border/70 bg-white shadow-sm",
        settings.color_mode === "BW" && "grayscale",
        className
      )}
    >
      <div
        className="absolute inset-2 grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {Array.from({ length: settings.pages_per_sheet }).map((_, slot) => {
          const pageNum = pageNumbers[slot];
          if (!pageNum) {
            return <div key={slot} className="rounded-sm bg-muted/20" />;
          }
          const src = thumbs[pageNum];
          return (
            <div
              key={slot}
              className="relative overflow-hidden rounded-sm border border-border/40 bg-white"
            >
              {loading || !src ? (
                <Skeleton className="absolute inset-0" />
              ) : (
                <img
                  src={src}
                  alt={`Page ${pageNum}`}
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
