"use client";

import {
  printerBannerLabel,
  printerBannerTone,
} from "@/lib/kiosk-display/printer-banner";
import type { KioskDisplayPrinterSnapshot } from "@/lib/kiosk-display/types";
import { cn } from "@/lib/utils";

type KioskPrinterBannerProps = {
  printer: KioskDisplayPrinterSnapshot | null;
};

export function KioskPrinterBanner({ printer }: KioskPrinterBannerProps) {
  const label = printerBannerLabel(printer);
  if (!label) return null;
  const tone = printerBannerTone(printer);
  return (
    <div
      className={cn(
        "absolute left-0 right-0 top-0 z-10 px-6 py-3 text-center text-lg font-medium",
        tone === "ok" && "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
        tone === "warn" && "bg-amber-500/15 text-amber-900 dark:text-amber-100",
        tone === "error" && "bg-destructive/15 text-destructive",
        tone === "muted" && "bg-muted text-muted-foreground"
      )}
    >
      {label}
    </div>
  );
}
