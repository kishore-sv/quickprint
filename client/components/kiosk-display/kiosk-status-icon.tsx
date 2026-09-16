"use client";

import { Check, Loader2, Printer, FileCheck, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KioskDisplayState } from "@/lib/kiosk-display/types";

const ICONS: Record<KioskDisplayState, typeof Inbox> = {
  IDLE: Inbox,
  RECEIVED: Inbox,
  PREPARED: FileCheck,
  PRINTING: Printer,
  COMPLETED: Check,
  FAILED: Check,
};

type KioskStatusIconProps = {
  state: KioskDisplayState;
  className?: string;
};

export function KioskStatusIcon({ state, className }: KioskStatusIconProps) {
  const Icon = ICONS[state];
  const spinning = state === "PRINTING" || state === "RECEIVED" || state === "PREPARED";

  return (
    <div
      className={cn(
        "flex size-28 items-center justify-center rounded-full bg-primary/10 text-primary",
        className
      )}
    >
      {spinning ? (
        <Loader2 className="size-16 animate-spin" strokeWidth={1.5} />
      ) : (
        <Icon className="size-16" strokeWidth={1.5} />
      )}
    </div>
  );
}
