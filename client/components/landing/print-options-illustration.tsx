"use client";

import { cn } from "@/lib/utils";

type PrintOptionsIllustrationProps = {
  className?: string;
};

const SINGLE_LINE_WIDTHS = ["72%", "94%", "88%", "65%", "91%", "78%", "84%"] as const;
const MINI_LINE_WIDTHS = ["80%", "92%", "70%", "86%"] as const;

const COLOR_LINE_CLASSES = [
  "bg-primary/75",
  "bg-emerald-500/70",
  "bg-amber-500/70",
  "bg-sky-500/70",
  "bg-violet-500/70",
  "bg-rose-500/65",
  "bg-teal-500/70",
] as const;

function ParagraphLines({
  widths,
  className,
  lineClassName = "bg-foreground/25",
}: {
  widths: readonly string[];
  className?: string;
  lineClassName?: string | readonly string[];
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {widths.map((width, index) => (
        <div
          key={`${width}-${index}`}
          className={cn(
            "h-[2.5px] rounded-full",
            Array.isArray(lineClassName) ? lineClassName[index % lineClassName.length] : lineClassName
          )}
          style={{ width }}
        />
      ))}
    </div>
  );
}

function SheetContent() {
  return (
    <>
      <div className="print-options-single-page absolute inset-0 flex flex-col p-2">
        <div className="mb-2 h-[2.5px] w-[42%] rounded-full bg-foreground/35" />
        <div className="relative flex-1">
          <ParagraphLines
            widths={SINGLE_LINE_WIDTHS}
            className="print-options-bw-lines absolute inset-0"
          />
          <ParagraphLines
            widths={SINGLE_LINE_WIDTHS}
            lineClassName={COLOR_LINE_CLASSES}
            className="print-options-color-lines absolute inset-0"
          />
        </div>
      </div>

      <div className="print-options-two-up-page absolute inset-0 grid grid-cols-2 gap-px p-1.5">
        <div className="relative border-r border-border/50 pr-1">
          <span className="absolute right-1 top-0 text-[0.38rem] leading-none text-muted-foreground/70">
            1
          </span>
          <ParagraphLines widths={MINI_LINE_WIDTHS} className="mt-2" />
        </div>
        <div className="relative pl-1">
          <span className="absolute right-1 top-0 text-[0.38rem] leading-none text-muted-foreground/70">
            2
          </span>
          <ParagraphLines widths={MINI_LINE_WIDTHS} className="mt-2" />
        </div>
      </div>
    </>
  );
}

const STAGE_LABELS = ["A4 · B&W", "A3 · B&W", "A3 · Color", "2-in-1"] as const;

export function PrintOptionsIllustration({ className }: PrintOptionsIllustrationProps) {
  return (
    <div
      className={cn(
        "relative mt-6 flex h-44 w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-card mask-x-from-98% mask-x-to-100% mask-y-from-85% mask-y-to-100%",
        className
      )}
      aria-hidden="true"
    >
      <style>{`
        @keyframes print-options-sheet-scale {
          0%,
          18% {
            transform: scale(1);
          }
          28%,
          62% {
            transform: scale(1.414);
          }
          72%,
          100% {
            transform: scale(1);
          }
        }

        @keyframes print-options-single-page {
          0%,
          61% {
            opacity: 1;
          }
          72%,
          88% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes print-options-two-up-page {
          0%,
          61% {
            opacity: 0;
          }
          72%,
          88% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes print-options-bw-lines {
          0%,
          41% {
            opacity: 1;
          }
          50%,
          61% {
            opacity: 0;
          }
          88%,
          100% {
            opacity: 1;
          }
          72%,
          87% {
            opacity: 0;
          }
        }

        @keyframes print-options-color-lines {
          0%,
          41% {
            opacity: 0;
          }
          50%,
          61% {
            opacity: 1;
          }
          62%,
          100% {
            opacity: 0;
          }
        }

        @keyframes print-options-label-0 {
          0%,
          17% {
            opacity: 1;
          }
          18%,
          87% {
            opacity: 0;
          }
          88%,
          100% {
            opacity: 1;
          }
        }

        @keyframes print-options-label-1 {
          0%,
          27% {
            opacity: 0;
          }
          28%,
          41% {
            opacity: 1;
          }
          42%,
          100% {
            opacity: 0;
          }
        }

        @keyframes print-options-label-2 {
          0%,
          49% {
            opacity: 0;
          }
          50%,
          61% {
            opacity: 1;
          }
          62%,
          100% {
            opacity: 0;
          }
        }

        @keyframes print-options-label-3 {
          0%,
          71% {
            opacity: 0;
          }
          72%,
          87% {
            opacity: 1;
          }
          88%,
          100% {
            opacity: 0;
          }
        }

        .print-options-sheet-wrapper {
          animation: print-options-sheet-scale 14s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          transform-origin: center center;
        }

        .print-options-single-page {
          animation: print-options-single-page 14s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .print-options-two-up-page {
          animation: print-options-two-up-page 14s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .print-options-bw-lines {
          animation: print-options-bw-lines 14s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .print-options-color-lines {
          animation: print-options-color-lines 14s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .print-options-label-0 {
          animation: print-options-label-0 14s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .print-options-label-1 {
          animation: print-options-label-1 14s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .print-options-label-2 {
          animation: print-options-label-2 14s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .print-options-label-3 {
          animation: print-options-label-3 14s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>

      <div className="relative mb-2 h-[0.8rem] w-full">
        {STAGE_LABELS.map((label, index) => (
          <p
            key={label}
            className={cn(
              "absolute inset-x-0 text-center font-heading text-[0.65rem] font-medium leading-none text-muted-foreground opacity-0",
              `print-options-label-${index}`
            )}
          >
            {label}
          </p>
        ))}
      </div>

      <div className="print-options-sheet-wrapper relative flex items-center justify-center">
        <div className="relative h-[6rem] w-[4.25rem] overflow-hidden rounded-sm border border-border/70 bg-white shadow-sm">
          <SheetContent />
        </div>
      </div>
    </div>
  );
}
