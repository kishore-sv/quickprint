import { cn } from "@/lib/utils";

/** Three overlapping circles — B/W or color ink dots (reference layout). */
export function ColorModeCircles({ mode }: { mode: "BW" | "COLOR" }) {
  const colors =
    mode === "BW"
      ? ["bg-neutral-400", "bg-neutral-600", "bg-neutral-300"]
      : ["bg-red-500", "bg-green-500", "bg-blue-500"];

  return (
    <div className="relative size-11 shrink-0" aria-hidden>
      <span
        className={cn(
          "absolute left-0 top-2 size-7 rounded-full opacity-90",
          colors[0]
        )}
      />
      <span
        className={cn(
          "absolute left-3.5 top-0 size-7 rounded-full opacity-90 mix-blend-multiply",
          colors[1]
        )}
      />
      <span
        className={cn(
          "absolute left-2 bottom-0 size-7 rounded-full opacity-90 mix-blend-multiply",
          colors[2]
        )}
      />
    </div>
  );
}

const SHEET_OUTLINE =
  "rounded-[3px] border border-neutral-400/70 bg-white shadow-sm";

/** Single vs duplex — distinct from pages-per-sheet N-up icons. */
export function SidesIcon({ duplex }: { duplex: "SINGLE" | "DOUBLE" }) {
  if (duplex === "SINGLE") {
    return (
      <div className="flex h-14 w-full items-center justify-center" aria-hidden>
        <div className={cn(SHEET_OUTLINE, "h-10 w-8")} />
      </div>
    );
  }

  return (
    <div className="relative flex h-14 w-full items-center justify-center" aria-hidden>
      <div
        className={cn(
          SHEET_OUTLINE,
          "absolute h-10 w-8 -translate-x-1.5 -translate-y-1 rotate-[-8deg] bg-neutral-200/80 shadow-none"
        )}
      />
      <div className={cn(SHEET_OUTLINE, "relative z-10 h-10 w-8 rotate-[4deg]")}>
        <div className="absolute inset-x-1.5 top-2 h-0.5 rounded-full bg-neutral-300" />
        <div className="absolute inset-x-1.5 top-3.5 h-0.5 rounded-full bg-neutral-300/80" />
        <div className="absolute inset-x-1.5 top-5 h-0.5 rounded-full bg-neutral-300/60" />
      </div>
    </div>
  );
}

const PAGE_CELL = "rounded-[2px] bg-neutral-300/90";

/** Mini page-layout icon for pages-per-sheet cards. */
export function PagesPerSheetLayoutIcon({ count }: { count: 1 | 2 | 4 | 6 }) {
  if (count === 1) {
    return (
      <div className="flex h-14 w-full items-center justify-center px-3" aria-hidden>
        <div className={cn(PAGE_CELL, "h-10 w-8")} />
      </div>
    );
  }
  if (count === 2) {
    return (
      <div className="flex h-14 w-full flex-col items-center justify-center gap-1 px-4" aria-hidden>
        <div className={cn(PAGE_CELL, "h-4 w-8")} />
        <div className={cn(PAGE_CELL, "h-4 w-8")} />
      </div>
    );
  }
  if (count === 4) {
    return (
      <div
        className="grid h-14 w-full grid-cols-2 grid-rows-2 gap-1 px-4 py-2"
        aria-hidden
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(PAGE_CELL, "min-h-0 w-full")} />
        ))}
      </div>
    );
  }
  return (
    <div
      className="grid h-14 w-full grid-cols-2 grid-rows-3 gap-0.5 px-4 py-1.5"
      aria-hidden
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={cn(PAGE_CELL, "min-h-0 w-full")} />
      ))}
    </div>
  );
}
