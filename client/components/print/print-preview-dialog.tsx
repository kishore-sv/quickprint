"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { PrintSheetPreview } from "@/components/print/print-sheet-preview";
import { buildPrintSheetLayout } from "@/lib/print-layout";
import type { PrintSettings } from "@/lib/types";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

type PrintPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filename: string;
  file: File;
  pageCount: number;
  pageRange: string;
  settings: PrintSettings;
};

function SideTabs({
  side,
  onSideChange,
}: {
  side: "front" | "back";
  onSideChange: (side: "front" | "back") => void;
}) {
  return (
    <div
      className="mx-auto flex w-fit rounded-lg border border-border bg-muted/40 p-0.5"
      role="tablist"
      aria-label="Sheet side"
    >
      {(["front", "back"] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={side === value}
          onClick={() => onSideChange(value)}
          className={cn(
            "rounded-md px-5 py-1.5 text-sm font-medium capitalize transition-colors",
            side === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {value}
        </button>
      ))}
    </div>
  );
}

function FlippingSheet({
  side,
  front,
  back,
}: {
  side: "front" | "back";
  front: React.ReactNode;
  back: React.ReactNode;
}) {
  const flipped = side === "back";
  return (
    <div className="mx-auto w-full max-w-xs sm:max-w-sm perspective-[900px]">
      <div
        className={cn(
          "relative aspect-[210/297] transition-transform duration-300 ease-in-out [transform-style:preserve-3d]",
          flipped && "[transform:rotateY(180deg)]"
        )}
      >
        <div className="absolute inset-0 [backface-visibility:hidden]">{front}</div>
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {back}
        </div>
      </div>
    </div>
  );
}

export function PrintPreviewDialog({
  open,
  onOpenChange,
  filename,
  file,
  pageCount,
  pageRange,
  settings,
}: PrintPreviewDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
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

  const [sheetIndex, setSheetIndex] = useState(0);
  const [side, setSide] = useState<"front" | "back">("front");

  useEffect(() => {
    if (open) {
      setSheetIndex(0);
      setSide("front");
    }
  }, [open]);

  const currentSheet = layout[sheetIndex];
  const hasBack = settings.duplex === "DOUBLE" && currentSheet?.back != null;
  const totalSheets = layout.length;

  const goPrev = () => {
    if (side === "back") {
      setSide("front");
      return;
    }
    if (sheetIndex > 0) {
      setSheetIndex((i) => i - 1);
      const prev = layout[sheetIndex - 1];
      setSide(prev?.back ? "back" : "front");
    }
  };

  const goNext = () => {
    if (side === "front" && hasBack) {
      setSide("back");
      return;
    }
    if (sheetIndex < totalSheets - 1) {
      setSheetIndex((i) => i + 1);
      setSide("front");
    }
  };

  const canPrev = sheetIndex > 0 || side === "back";
  const canNext = sheetIndex < totalSheets - 1 || (side === "front" && hasBack);

  const sheetClass = "h-full w-full rounded-md border border-border/60 shadow-md";

  const body = (
    <div className="space-y-4">
      {hasBack && <SideTabs side={side} onSideChange={setSide} />}

      {hasBack ? (
        <FlippingSheet
          side={side}
          front={
            <PrintSheetPreview
              file={file}
              pageCount={pageCount}
              pageRange={pageRange}
              settings={settings}
              sheetIndex={sheetIndex}
              side="front"
              highQuality
              className={sheetClass}
            />
          }
          back={
            <PrintSheetPreview
              file={file}
              pageCount={pageCount}
              pageRange={pageRange}
              settings={settings}
              sheetIndex={sheetIndex}
              side="back"
              highQuality
              className={sheetClass}
            />
          }
        />
      ) : (
        <div className="mx-auto w-full max-w-xs sm:max-w-sm">
          <PrintSheetPreview
            file={file}
            pageCount={pageCount}
            pageRange={pageRange}
            settings={settings}
            sheetIndex={sheetIndex}
            side="front"
            highQuality
            className={sheetClass}
          />
        </div>
      )}

      <div className="space-y-1 text-center">
        <p className="truncate px-4 text-sm font-medium" title={filename}>{filename}</p>
        <p className="text-muted-foreground text-xs">
          Sheet {sheetIndex + 1} of {totalSheets}
          {hasBack ? ` · ${side === "front" ? "Front" : "Back"}` : ""}
        </p>
      </div>

      <div className="flex justify-between gap-2">
        <Button type="button" variant="outline" disabled={!canPrev} onClick={goPrev}>
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <Button type="button" disabled={!canNext} onClick={goNext}>
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Print preview</DialogTitle>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-8">
        <DrawerHeader>
          <DrawerTitle>Print preview</DrawerTitle>
        </DrawerHeader>
        {body}
      </DrawerContent>
    </Drawer>
  );
}
