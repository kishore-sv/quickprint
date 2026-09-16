"use client";

import { KioskProgress } from "./kiosk-progress";
import { KioskStatusIcon } from "./kiosk-status-icon";
import { buildProgressSteps } from "@/lib/kiosk-display/map-kiosk-display-state";
import type { KioskDisplayState } from "@/lib/kiosk-display/types";

const STATUS_HEADLINE: Record<Exclude<KioskDisplayState, "IDLE" | "COMPLETED" | "FAILED">, string> =
  {
    RECEIVED: "Kiosk received",
    PREPARED: "File prepared",
    PRINTING: "Printing",
  };

type KioskJobProgressProps = {
  state: Exclude<KioskDisplayState, "IDLE" | "COMPLETED" | "FAILED">;
};

export function KioskJobProgress({ state }: KioskJobProgressProps) {
  const steps = buildProgressSteps(state);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-12 px-8">
      <KioskStatusIcon state={state} />
      <h1 className="font-heading text-4xl font-semibold text-foreground md:text-5xl">
        {STATUS_HEADLINE[state]}
      </h1>
      <KioskProgress steps={steps} />
    </div>
  );
}
