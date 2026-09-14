"use client";

import { MapPinIcon } from "lucide-react";
import { AnimationPauseRoot } from "@/components/landing/animation-pause-root";
import { cn } from "@/lib/utils";

type KioskConvenienceIllustrationProps = {
  className?: string;
};

const KIOSKS = [
  { label: "Library", highlighted: true },
  { label: "Lab", highlighted: false },
  { label: "Café", highlighted: false },
] as const;

function YouMarker() {
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5">
      <div className="flex size-5 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
        <MapPinIcon className="size-2.5 text-primary" strokeWidth={2.5} />
      </div>
      <span className="text-[0.34rem] font-medium text-muted-foreground">You</span>
    </div>
  );
}

function KioskPillar({ label, highlighted }: { label: string; highlighted: boolean }) {
  return (
    <div className="relative flex flex-col items-center gap-0.5">
      {highlighted && (
        <span
          className="kiosk-convenience-pulse pointer-events-none absolute -top-1 left-1/2 size-8 -translate-x-1/2 rounded-full border border-primary/40"
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          "relative flex h-[3.25rem] w-[2.35rem] flex-col overflow-hidden rounded-md border bg-slate-200 p-0.5 shadow-sm",
          highlighted ? "border-primary/40" : "border-border/80"
        )}
      >
        <div className="flex flex-1 items-center justify-center rounded-[4px] bg-linear-to-br from-slate-700 via-slate-600 to-slate-800">
          <div className="size-2 rounded-[2px] border border-white/20 bg-white/90" aria-hidden="true" />
        </div>
      </div>
      <span className="text-[0.32rem] text-muted-foreground">{label}</span>
    </div>
  );
}

function PathPulse() {
  return (
    <div className="relative z-10 mx-1.5 min-w-[3.5rem] flex-1 self-center">
      <div className="h-px w-full border-t border-dashed border-border/80" aria-hidden="true" />
      <span
        className="kiosk-convenience-travel-dot absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_6px_1px] shadow-primary/40"
        aria-hidden="true"
      />
    </div>
  );
}

/** Muted lat/long grid — horizontal + vertical lines like a map. */
function MapGridBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--muted-foreground)_22%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--muted-foreground)_22%,transparent)_1px,transparent_1px)] bg-size-[16px_16px]"
      aria-hidden="true"
    />
  );
}

export function KioskConvenienceIllustration({ className }: KioskConvenienceIllustrationProps) {
  return (
    <AnimationPauseRoot
      className={cn(
        "relative mt-6 flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl bg-card mask-x-from-72% mask-x-to-100% mask-y-from-68% mask-y-to-100%",
        className
      )}
      aria-hidden="true"
    >
      <MapGridBackground />
      <style>{`
        @keyframes kiosk-convenience-pulse {
          0%,
          100% {
            transform: translateX(-50%) scale(0.75);
            opacity: 0.5;
          }
          50% {
            transform: translateX(-50%) scale(1.15);
            opacity: 0;
          }
        }

        @keyframes kiosk-convenience-travel {
          0% {
            left: 0%;
            opacity: 0;
          }
          8% {
            opacity: 1;
          }
          72% {
            left: 100%;
            opacity: 1;
          }
          82%,
          100% {
            left: 100%;
            opacity: 0;
          }
        }

        .kiosk-convenience-pulse {
          animation: kiosk-convenience-pulse 3.5s ease-out infinite;
        }

        .kiosk-convenience-travel-dot {
          animation: kiosk-convenience-travel 3.5s ease-in-out infinite;
        }
      `}</style>

      <div className="relative z-10 flex w-full max-w-[18rem] items-end justify-center px-3 pb-6">
        <YouMarker />
        <PathPulse />
        <div className="flex shrink-0 items-end gap-2">
          {KIOSKS.map((kiosk) => (
            <KioskPillar key={kiosk.label} label={kiosk.label} highlighted={kiosk.highlighted} />
          ))}
        </div>
      </div>
    </AnimationPauseRoot>
  );
}
