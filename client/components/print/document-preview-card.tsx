"use client";

import { Expand, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintSheetPreview } from "@/components/print/print-sheet-preview";
import type { PrintSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

type DocumentPreviewCardProps = {
  filename: string;
  pageCount: number;
  file: File;
  pageRange: string;
  settings: PrintSettings;
  onPreview?: () => void;
  onDelete?: () => void;
  compact?: boolean;
  className?: string;
};

export function DocumentPreviewCard({
  filename,
  pageCount,
  file,
  pageRange,
  settings,
  onPreview,
  onDelete,
  compact = false,
  className,
}: DocumentPreviewCardProps) {
  return (
    <div className={cn("flex gap-3", className)}>
      <div className={cn("shrink-0", compact ? "w-20" : "w-24 sm:w-28")}>
        <PrintSheetPreview
          file={file}
          pageCount={pageCount}
          pageRange={pageRange}
          settings={settings}
          sheetIndex={0}
          side="front"
        />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-medium text-sm" title={filename}>{filename}</p>
        <p className="text-muted-foreground text-xs">
          {pageCount} page{pageCount === 1 ? "" : "s"}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {onPreview && (
            <Button type="button" variant="outline" size="sm" onClick={onPreview}>
              <Expand className="size-3.5" />
              Preview
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/5 hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
