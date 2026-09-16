"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgressStepState } from "@/lib/kiosk-display/map-kiosk-display-state";
import { KioskAnimatedCheck } from "./kiosk-animated-check";

type KioskProgressProps = {
  steps: ProgressStepState[];
  /** Stagger check pop-in on the completed screen. */
  animateCompletedChecks?: boolean;
};

export function KioskProgress({ steps, animateCompletedChecks = false }: KioskProgressProps) {
  return (
    <ol className="mx-auto flex w-full max-w-3xl flex-row items-center justify-between gap-2 px-2 sm:gap-4">
      {steps.map((step, index) => (
        <li key={step.key} className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
          <div
            className={cn(
              "grid size-14 shrink-0 place-items-center rounded-full border-2 transition-colors",
              step.status === "completed" && "border-primary bg-primary text-primary-foreground",
              step.status === "current" && "border-primary bg-primary/10 text-primary animate-pulse",
              step.status === "future" && "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
            )}
          >
            {step.status === "completed" && animateCompletedChecks ? (
              <KioskAnimatedCheck
                iconClassName="text-primary-foreground"
                delay={index * 0.2}
              />
            ) : step.status === "completed" ? (
              <Check className="size-7 shrink-0" strokeWidth={2.5} />
            ) : (
              <span className="size-3 shrink-0 rounded-full bg-current" />
            )}
          </div>
          <span
            className={cn(
              "font-heading text-xl font-medium md:text-2xl",
              step.status === "future" && "text-muted-foreground",
              step.status === "current" && "text-primary",
              step.status === "completed" && "text-foreground"
            )}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
