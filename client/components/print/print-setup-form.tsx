"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Plus, Search } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  renderPdfPagePreview,
  renderPdfPageThumbnail,
} from "@/lib/pdf-page-thumbnails";
import {
  estimateJobTotalPaise,
  estimatePrintSeconds,
  filterPagesByPageSet,
  formatPageRange,
  formatRupees,
  unitPricePaise,
  parsePageRange,
} from "@/lib/print-pricing";
import type { PricingConfig, PrintSettings, SavedFile } from "@/lib/types";
import { pageMaxWidthClass } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { DocumentPreviewCard } from "@/components/print/document-preview-card";
import { PrintPreviewDialog } from "@/components/print/print-preview-dialog";
import {
  ColorModeCircles,
  PagesPerSheetLayoutIcon,
  SidesIcon,
} from "@/components/print/print-ui-icons";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Space above bottom tab bar (matches BottomNav). */
const BOTTOM_NAV_CLEARANCE =
  "calc(4.5rem + env(safe-area-inset-bottom))";

const COPY_PRESETS = [1, 2, 5, 10, 25, 50] as const;
const MAX_COPIES = 100;

const NUP_OPTIONS = [
  { value: 1 as const, label: "1 on 1" },
  { value: 2 as const, label: "2 on 1" },
  { value: 4 as const, label: "4 on 1" },
  { value: 6 as const, label: "6 on 1" },
];

export type PrintFileDraft = {
  file: File;
  /** User-facing filename before internal PDF conversion. */
  displayName: string;
  /** Original upload size in bytes. */
  displaySizeBytes: number;
  pageCount: number;
  savedFile: SavedFile | null;
  selectedPages: Set<number>;
  settings: PrintSettings;
};

export function getDraftDisplayName(draft: PrintFileDraft): string {
  return draft.savedFile?.original_filename ?? draft.displayName;
}

export function getDraftDisplaySizeBytes(draft: PrintFileDraft): number {
  return draft.savedFile?.file_size_bytes ?? draft.displaySizeBytes;
}

type PrintSetupFormProps = {
  drafts: PrintFileDraft[];
  fileIndex: number;
  onFileIndexChange: (index: number) => void;
  onSelectedPagesChange: (index: number, pages: Set<number>) => void;
  settings: PrintSettings;
  onSettingsChange: (settings: PrintSettings) => void;
  applySettingsToAll: boolean;
  onApplySettingsToAllChange: (value: boolean) => void;
  pricing: PricingConfig | null;
  submitting: boolean;
  onSubmit: () => void;
};

function allPagesSet(pageCount: number) {
  return new Set(Array.from({ length: pageCount }, (_, i) => i + 1));
}

function draftPricingInput(draft: PrintFileDraft) {
  const { pageCount, selectedPages, settings } = draft;
  if (pageCount < 1 || selectedPages.size === 0) return null;
  const effective = filterPagesByPageSet([...selectedPages], settings.page_set);
  if (effective.length === 0) return null;
  const pageRange =
    effective.length === pageCount && settings.page_set === "ALL"
      ? "all"
      : formatPageRange(effective, pageCount);
  return { pageCount, pageRange, settings };
}

export function PrintSetupForm({
  drafts,
  fileIndex,
  onFileIndexChange,
  onSelectedPagesChange,
  settings,
  onSettingsChange,
  applySettingsToAll,
  onApplySettingsToAllChange,
  pricing,
  submitting,
  onSubmit,
}: PrintSetupFormProps) {
  const draft = drafts[fileIndex];
  const pageCount = draft?.pageCount ?? 0;
  const selectedPages = draft?.selectedPages ?? new Set<number>();

  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [thumbsLoading, setThumbsLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStartIndex, setPreviewStartIndex] = useState(0);
  const [previewImages, setPreviewImages] = useState<Record<number, string>>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [carouselPage, setCarouselPage] = useState(1);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [sheetPreviewOpen, setSheetPreviewOpen] = useState(false);
  const [copiesInput, setCopiesInput] = useState(() => String(settings.copies));
  const copiesEditingRef = useRef(false);

  useEffect(() => {
    if (!copiesEditingRef.current) {
      setCopiesInput(String(settings.copies));
    }
  }, [settings.copies]);

  useEffect(() => {
    if (!draft?.file || pageCount < 1) return;
    let cancelled = false;
    setThumbsLoading(true);
    setThumbnails({});
    void (async () => {
      const next: Record<number, string> = {};
      for (let p = 1; p <= pageCount; p++) {
        if (cancelled) return;
        try {
          next[p] = await renderPdfPageThumbnail(draft.file, p, 112);
        } catch {
          /* skip failed thumbnail */
        }
      }
      if (!cancelled) {
        setThumbnails(next);
        setThumbsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draft?.file, pageCount]);

  const openPreview = useCallback((page: number) => {
    setPreviewStartIndex(page - 1);
    setCarouselPage(page);
    setPreviewOpen(true);
  }, []);

  const renderPreviewPage = useCallback(
    async (page: number) => {
      if (!draft?.file || page < 1 || page > pageCount) return;
      const narrow = window.innerWidth < 640;
      const maxCssWidth = Math.floor(window.innerWidth * (narrow ? 0.94 : 0.82));
      const maxCssHeight = Math.floor(window.innerHeight * (narrow ? 0.68 : 0.78));
      try {
        const dataUrl = await renderPdfPagePreview(
          draft.file,
          page,
          maxCssWidth,
          maxCssHeight
        );
        setPreviewImages((prev) =>
          prev[page] === dataUrl ? prev : { ...prev, [page]: dataUrl }
        );
      } catch {
        /* skip failed page */
      }
    },
    [draft?.file, pageCount]
  );

  useEffect(() => {
    if (!previewOpen || !draft?.file || pageCount < 1) return;
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewImages({});

    void (async () => {
      await renderPreviewPage(previewStartIndex + 1);
      if (!cancelled) setPreviewLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [previewOpen, draft?.file, pageCount, previewStartIndex, renderPreviewPage]);

  useEffect(() => {
    if (!previewOpen || previewLoading) return;
    void renderPreviewPage(carouselPage);
  }, [previewOpen, previewLoading, carouselPage, renderPreviewPage]);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => {
      setCarouselPage(carouselApi.selectedScrollSnap() + 1);
    };
    onSelect();
    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi || !previewOpen) return;
    carouselApi.scrollTo(previewStartIndex, true);
  }, [carouselApi, previewOpen, previewStartIndex]);

  const updateSelectedPages = useCallback(
    (next: Set<number>) => {
      onSelectedPagesChange(fileIndex, next);
      const range = formatPageRange([...next].sort((a, b) => a - b), pageCount);
      onSettingsChange({ ...settings, page_range: range || "all" });
    },
    [fileIndex, onSelectedPagesChange, onSettingsChange, pageCount, settings]
  );

  const togglePage = (page: number) => {
    const next = new Set(selectedPages);
    if (next.has(page)) {
      if (next.size > 1) next.delete(page);
    } else {
      next.add(page);
    }
    updateSelectedPages(next);
  };

  const selectAllPages = () => updateSelectedPages(allPagesSet(pageCount));
  const clearPages = () => updateSelectedPages(new Set([1]));

  const setCopies = (copies: number) => {
    const clamped = Math.min(MAX_COPIES, Math.max(1, copies));
    onSettingsChange({ ...settings, copies: clamped });
  };

  const commitCopiesInput = () => {
    copiesEditingRef.current = false;
    const trimmed = copiesInput.trim();
    if (trimmed === "") {
      setCopies(1);
      setCopiesInput("1");
      return;
    }
    const n = parseInt(trimmed, 10);
    if (Number.isNaN(n)) {
      setCopies(1);
      setCopiesInput("1");
      return;
    }
    setCopies(n);
    setCopiesInput(String(Math.min(MAX_COPIES, Math.max(1, n))));
  };

  const handleCopiesInputChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits === "") {
      setCopiesInput("");
      return;
    }
    const n = Math.min(MAX_COPIES, parseInt(digits, 10));
    setCopiesInput(String(n));
    setCopies(n);
  };

  const jobTotals = useMemo(() => {
    if (!pricing) {
      return { physicalSheets: 0, pagesInRange: 0, totalPaise: 0, estSeconds: 0 };
    }
    const inputs = drafts
      .map(draftPricingInput)
      .filter((input): input is NonNullable<typeof input> => input != null);
    if (inputs.length === 0) {
      return { physicalSheets: 0, pagesInRange: 0, totalPaise: 0, estSeconds: 0 };
    }
    const priced = estimateJobTotalPaise(inputs, pricing);
    const estSeconds = drafts.reduce((sum, d) => {
      const input = draftPricingInput(d);
      if (!input) return sum;
      const pages = parsePageRange(input.pageRange, input.pageCount).length;
      return sum + estimatePrintSeconds(pages, d.settings.copies);
    }, 0);
    return {
      physicalSheets: priced.physicalSheets,
      pagesInRange: priced.logicalPages,
      totalPaise: priced.totalPaise,
      estSeconds: Math.max(12, estSeconds),
    };
  }, [drafts, pricing]);

  const bwRatePaise = pricing?.bw_per_sheet_paise ?? 200;
  const colorRatePaise = pricing?.color_per_sheet_paise ?? 1000;
  const bwRate = bwRatePaise / 100;
  const colorRate = colorRatePaise / 100;
  const singleSideRate =
    unitPricePaise({
      colorMode: settings.color_mode,
      duplex: "SINGLE",
      bwPerSheetPaise: bwRatePaise,
      colorPerSheetPaise: colorRatePaise,
    }) / 100;
  const duplexDisplayRate =
    unitPricePaise({
      colorMode: settings.color_mode,
      duplex: "DOUBLE",
      bwPerSheetPaise: bwRatePaise,
      colorPerSheetPaise: colorRatePaise,
    }) / 100;

  const selectionLabel =
    selectedPages.size === pageCount
      ? `All ${pageCount} pages`
      : `${selectedPages.size} of ${pageCount} pages`;

  const otherFiles = drafts.length - 1;
  const allFilesHavePages = drafts.every((d) => d.selectedPages.size > 0);

  if (!draft) return null;

  return (
    <>
    <div
      className="relative flex w-full min-w-0 max-w-full flex-col gap-5 overflow-x-hidden"
      style={{ paddingBottom: `calc(${BOTTOM_NAV_CLEARANCE} + 5.5rem)` }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          File {fileIndex + 1} of {drafts.length}
        </p>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={fileIndex <= 0}
            onClick={() => onFileIndexChange(fileIndex - 1)}
            aria-label="Previous file"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={fileIndex >= drafts.length - 1}
            onClick={() => onFileIndexChange(fileIndex + 1)}
            aria-label="Next file"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <DocumentPreviewCard
        filename={getDraftDisplayName(draft)}
        pageCount={pageCount}
        file={draft.file}
        pageRange={
          formatPageRange([...selectedPages].sort((a, b) => a - b), pageCount) || "all"
        }
        settings={settings}
        onPreview={() => setSheetPreviewOpen(true)}
      />

      <PrintPreviewDialog
        open={sheetPreviewOpen}
        onOpenChange={setSheetPreviewOpen}
        filename={getDraftDisplayName(draft)}
        file={draft.file}
        pageCount={pageCount}
        pageRange={
          formatPageRange([...selectedPages].sort((a, b) => a - b), pageCount) || "all"
        }
        settings={settings}
      />

      {otherFiles > 0 && (
        <Accordion className="rounded-xl border bg-card px-3">
          <AccordionItem value="files" className="border-0">
            <AccordionTrigger className="gap-2 py-3 hover:no-underline [&>svg]:ml-auto">
              <span className="min-w-0 flex-1 text-left font-medium">
                {otherFiles} more file{otherFiles > 1 ? "s" : ""} to set up
              </span>
              <Badge variant="secondary" className="shrink-0 font-normal">
                optional
              </Badge>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pb-3">
              {drafts.map((d, i) => (
                <Button
                  key={d.savedFile?.id ?? `${getDraftDisplayName(d)}-${i}`}
                  type="button"
                  variant={i === fileIndex ? "secondary" : "ghost"}
                  className="h-auto w-full justify-start py-2 text-left font-normal"
                  onClick={() => onFileIndexChange(i)}
                >
                  <span className="truncate">
                    {i + 1}. {getDraftDisplayName(d)}
                  </span>
                </Button>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      <section className="min-w-0 space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-base font-semibold">Pages to print</h2>
          <span className="text-xs text-muted-foreground">tap to include or exclude</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={selectAllPages}>
            Select all
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={clearPages}>
            Clear
          </Button>
          <span className="w-full text-sm text-muted-foreground sm:ml-auto sm:w-auto">
            {selectionLabel}
          </span>
        </div>

        <div
          className="min-h-[156px] min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-xl border border-border/60 bg-muted/20 p-3 [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [overscroll-behavior-x:contain] [overscroll-behavior-y:none] [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max flex-nowrap gap-3">
            {thumbsLoading &&
              Array.from({ length: Math.min(pageCount, 4) }).map((_, i) => (
                <Skeleton key={i} className="h-[148px] w-[108px] shrink-0 rounded-xl" />
              ))}
            {!thumbsLoading &&
              Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => {
                const active = selectedPages.has(page);
                return (
                  <div
                    key={page}
                    role="button"
                    tabIndex={0}
                    onClick={() => togglePage(page)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        togglePage(page);
                      }
                    }}
                    className={cn(
                      "relative shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 bg-muted/30 text-left transition-colors",
                      active ? "border-primary" : "border-transparent opacity-70"
                    )}
                  >
                    {active && (
                      <span
                        className="absolute left-2 top-2 z-10 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
                        aria-hidden
                      >
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                    )}
                    {thumbnails[page] ? (
                      <img
                        src={thumbnails[page]}
                        alt={`Page ${page}`}
                        className="h-[140px] w-[100px] bg-white object-contain object-top"
                      />
                    ) : (
                      <div className="flex h-[140px] w-[100px] items-center justify-center bg-muted">
                        <Spinner className="size-5" />
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-sm"
                      className="absolute bottom-2 left-2 size-7 rounded-full bg-background/90 shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        void openPreview(page);
                      }}
                      aria-label={`Preview page ${page}`}
                    >
                      <Search className="size-3.5" />
                    </Button>
                    <span
                      className="absolute bottom-2 right-2 flex size-6 items-center justify-center rounded-full bg-background/90 text-xs font-medium shadow-sm"
                    >
                      {page}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      <section className="min-w-0 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">Copies</h2>
          <span className="shrink-0 text-xs text-muted-foreground">1 – {MAX_COPIES}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-muted/50 p-2 sm:gap-2 sm:p-3">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-10 shrink-0 rounded-xl bg-background sm:size-12"
            onClick={() => setCopies(settings.copies - 1)}
            disabled={settings.copies <= 1}
            aria-label="Fewer copies"
          >
            <Minus className="size-5" />
          </Button>
          <div className="flex min-w-0 flex-1 items-center justify-center px-1">
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Number of copies"
              min={1}
              max={MAX_COPIES}
              className="h-14 w-full min-w-0 max-w-none flex-1 border-0 bg-transparent px-0 text-center text-lg leading-none font-semibold tracking-tight tabular-nums shadow-none focus-visible:border-transparent focus-visible:ring-0 sm:h-16 sm:text-5xl md:text-6xl"
              value={copiesInput}
              onFocus={() => {
                copiesEditingRef.current = true;
              }}
              onChange={(e) => handleCopiesInputChange(e.target.value)}
              onBlur={commitCopiesInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-10 shrink-0 rounded-xl bg-background sm:size-12"
            onClick={() => setCopies(settings.copies + 1)}
            disabled={settings.copies >= MAX_COPIES}
            aria-label="More copies"
          >
            <Plus className="size-5" />
          </Button>
        </div>
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {COPY_PRESETS.map((n) => (
            <Button
              key={n}
              type="button"
              size="sm"
              variant={settings.copies === n ? "default" : "outline"}
              className={cn(
                "min-w-0 rounded-lg px-0",
                settings.copies === n && "shadow-sm"
              )}
              onClick={() => setCopies(n)}
            >
              {n}
            </Button>
          ))}
        </div>
      </section>

      <section className="min-w-0 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">Sides</h2>
          <span className="shrink-0 text-xs text-muted-foreground">per sheet</span>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3">
          {(
            [
              { value: "SINGLE" as const, label: "Single side", rate: singleSideRate },
              { value: "DOUBLE" as const, label: "Both sides", rate: duplexDisplayRate },
            ] as const
          ).map((opt) => {
            const selected = settings.duplex === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSettingsChange({ ...settings, duplex: opt.value })}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-2 rounded-xl border-2 px-2 py-3 text-center transition-colors sm:px-3 sm:py-4",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-muted/40"
                )}
              >
                <SidesIcon duplex={opt.value} />
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-xs text-muted-foreground">
                  ₹{opt.rate.toFixed(2)} / sheet
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Both sides uses half the paper - usually cheaper for long documents.
        </p>
      </section>

      <section className="min-w-0 space-y-3">
        <h2 className="text-base font-semibold">Color mode</h2>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3">
          {(
            [
              {
                value: "BW" as const,
                label: "B/W",
                rate: bwRate,
              },
              {
                value: "COLOR" as const,
                label: "Color",
                rate: colorRate,
              },
            ] as const
          ).map((opt) => {
            const selected = settings.color_mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSettingsChange({ ...settings, color_mode: opt.value })}
                className={cn(
                  "flex min-w-0 items-center justify-between gap-2 rounded-xl border-2 px-3 py-3 text-left transition-colors sm:px-4 sm:py-3.5",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-muted/40"
                )}
              >
                <div className="min-w-0">
                  <span className="block text-sm font-semibold">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">
                    ₹{opt.rate.toFixed(0)}/sheet
                  </span>
                </div>
                <ColorModeCircles mode={opt.value} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="min-w-0 space-y-3">
        <h2 className="text-base font-semibold">Pages per sheet</h2>
        <div className="grid grid-cols-4 gap-2">
          {NUP_OPTIONS.map((opt) => {
            const selected = settings.pages_per_sheet === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onSettingsChange({ ...settings, pages_per_sheet: opt.value })
                }
                className={cn(
                  "flex min-w-0 flex-col overflow-hidden rounded-xl border-2 transition-colors",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-muted/40"
                )}
              >
                <PagesPerSheetLayoutIcon count={opt.value} />
                <span className="border-t border-border/60 py-2 text-center text-xs font-medium">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <Accordion multiple className="min-w-0 space-y-0 rounded-xl border bg-card px-3">
        <AccordionItem value="advanced" className="border-b">
          <AccordionTrigger className="flex-wrap gap-x-2 gap-y-0.5 py-3.5 hover:no-underline [&>svg]:ml-auto">
            <span className="font-medium">Advanced options</span>
            <span className="w-full text-xs text-muted-foreground sm:mr-2 sm:w-auto sm:text-right">
              page range, N-up, quality
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="page-range-advanced">Page range</Label>
              <p className="text-xs text-muted-foreground">
                Same as the page picker above
              </p>
              <Input
                id="page-range-advanced"
                placeholder="All pages - or 1-3,5,7-9"
                value={
                  settings.page_range === "all" ? "" : settings.page_range
                }
                onChange={(e) => {
                  const raw = e.target.value;
                  const value = raw.trim();
                  if (value === "" || value.toLowerCase() === "all") {
                    onSettingsChange({ ...settings, page_range: "all" });
                    updateSelectedPages(allPagesSet(pageCount));
                    return;
                  }
                  onSettingsChange({ ...settings, page_range: value });
                  const parsed = parsePageRange(value, pageCount);
                  if (parsed.length > 0) {
                    onSelectedPagesChange(fileIndex, new Set(parsed));
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value === "" || value.toLowerCase() === "all") {
                    onSettingsChange({ ...settings, page_range: "all" });
                    updateSelectedPages(allPagesSet(pageCount));
                    return;
                  }
                  const parsed = parsePageRange(value, pageCount);
                  if (parsed.length === 0) {
                    onSettingsChange({ ...settings, page_range: "all" });
                    updateSelectedPages(allPagesSet(pageCount));
                    return;
                  }
                  const range = formatPageRange(parsed, pageCount);
                  onSettingsChange({ ...settings, page_range: range });
                  onSelectedPagesChange(fileIndex, new Set(parsed));
                }}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="nup">Pages per sheet</Label>
                <Select
                  value={String(settings.pages_per_sheet)}
                  onValueChange={(v) =>
                    onSettingsChange({ ...settings, pages_per_sheet: Number(v) })
                  }
                >
                  <SelectTrigger id="nup" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NUP_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="page-set">Page set</Label>
                <Select
                  value={settings.page_set}
                  onValueChange={(v) =>
                    onSettingsChange({
                      ...settings,
                      page_set: v as PrintSettings["page_set"],
                    })
                  }
                >
                  <SelectTrigger id="page-set" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All pages</SelectItem>
                    <SelectItem value="ODD">Odd pages</SelectItem>
                    <SelectItem value="EVEN">Even pages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="print-order">Order</Label>
                <Select
                  value={settings.order}
                  onValueChange={(v) =>
                    onSettingsChange({
                      ...settings,
                      order: v as PrintSettings["order"],
                    })
                  }
                >
                  <SelectTrigger id="print-order" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="REVERSE">Reverse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orientation">Orientation</Label>
                <Select
                  value={settings.orientation}
                  onValueChange={(v) =>
                    onSettingsChange({
                      ...settings,
                      orientation: v as PrintSettings["orientation"],
                    })
                  }
                >
                  <SelectTrigger id="orientation" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO">Auto (use document)</SelectItem>
                    <SelectItem value="PORTRAIT">Portrait</SelectItem>
                    <SelectItem value="LANDSCAPE">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="print-quality">Quality</Label>
              <Select
                value={settings.quality}
                onValueChange={(v) =>
                  onSettingsChange({
                    ...settings,
                    quality: v as PrintSettings["quality"],
                  })
                }
              >
                <SelectTrigger id="print-quality" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="BEST">Best</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <Checkbox
                  checked={settings.fit_to_page}
                  onCheckedChange={(c) =>
                    onSettingsChange({ ...settings, fit_to_page: c === true })
                  }
                />
                Fit to page
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <Checkbox
                  checked={settings.collate}
                  onCheckedChange={(c) =>
                    onSettingsChange({ ...settings, collate: c === true })
                  }
                />
                Collate copies
              </label>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {otherFiles > 0 && (
        <label
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3"
        >
          <Checkbox
            checked={applySettingsToAll}
            onCheckedChange={(c) => onApplySettingsToAllChange(c === true)}
            className="mt-0.5"
          />
          <div className="space-y-0.5">
            <p className="text-sm font-medium leading-snug">
              Use these settings for the other {otherFiles} file
              {otherFiles > 1 ? "s" : ""} too
            </p>
            <p className="text-xs text-muted-foreground">Page selection stays per file.</p>
          </div>
        </label>
      )}

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreviewImages({});
        }}
      >
        <DialogContent
          className={cn(
            "flex flex-col gap-1 overflow-hidden p-2 sm:gap-2",
            "w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] max-h-[min(88dvh,100%)]",
            "sm:max-h-[92dvh] sm:w-full sm:max-w-lg md:max-w-xl"
          )}
        >
          <DialogHeader className="shrink-0 px-1 pr-8">
            <DialogTitle className="text-sm sm:text-base">
              Page {carouselPage} of {pageCount}
            </DialogTitle>
          </DialogHeader>
          <div
            className={cn(
              "relative min-h-0 w-full px-6 sm:px-10",
              "h-[min(72dvh,680px)] max-h-[calc(88dvh-3.75rem)]",
              "sm:max-h-[calc(92dvh-4.5rem)]"
            )}
          >
            {previewLoading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner className="size-8" />
              </div>
            ) : (
              <Carousel
                key={`${getDraftDisplayName(draft)}-${previewStartIndex}-${previewOpen}`}
                setApi={setCarouselApi}
                opts={{ startIndex: previewStartIndex, align: "center" }}
                className="absolute inset-0 h-full w-full"
              >
                <CarouselContent className="-ml-2 h-full">
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
                    <CarouselItem key={page} className="h-full pl-2">
                      <div
                        className="flex h-full w-full items-center justify-center overflow-hidden rounded-lg border bg-white p-2 shadow-sm sm:p-3"
                      >
                        {previewImages[page] ? (
                          <img
                            src={previewImages[page]}
                            alt={`Page ${page}`}
                            className="mx-auto block max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <Skeleton className="aspect-[1/1.414] max-h-full w-auto max-w-full" />
                        )}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-1 size-8 sm:left-2 sm:size-9" />
                <CarouselNext className="right-1 size-8 sm:right-2 sm:size-9" />
              </Carousel>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>

    <div
      className="pointer-events-none fixed inset-x-0 z-40 px-4"
      style={{ bottom: BOTTOM_NAV_CLEARANCE }}
    >
      <div className={cn("pointer-events-auto mx-auto w-full ", pageMaxWidthClass)}>
        <div
          className="flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl backdrop-blur-sm bg-background/70 ring-2 ring-border ring-offset-2 ring-offset-blue-500 px-3 py-3 shadow-lg sm:px-4"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-semibold tabular-nums sm:text-2xl">
              ₹{formatRupees(jobTotals.totalPaise)}
            </p>
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
              {jobTotals.physicalSheets} sheets · {jobTotals.pagesInRange} pages ·{" "}
              {jobTotals.estSeconds} sec
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="h-auto shrink-0 rounded-xl px-3 py-2.5 text-sm sm:px-5 sm:py-3 sm:text-base"
            disabled={submitting || !allFilesHavePages}
            onClick={onSubmit}
          >
            {submitting ? (
              <>
                <Spinner className="size-4" />
                Sending…
              </>
            ) : (
              "Send to print"
            )}
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}
