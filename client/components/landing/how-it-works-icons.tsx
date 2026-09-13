"use client";

import { useId } from "react";
import type { LucideIcon } from "lucide-react";

export type GradientToken = "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5" | "primary";

export function GradientStepIcon({
  icon: Icon,
  from,
  to,
  className,
}: {
  icon: LucideIcon;
  from: GradientToken;
  to: GradientToken;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const gradientId = `step-icon-gradient-${id}`;

  return (
    <>
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={`var(--${from})`} />
            <stop offset="100%" stopColor={`var(--${to})`} />
          </linearGradient>
        </defs>
      </svg>
      <Icon className={className} style={{ stroke: `url(#${gradientId})` }} />
    </>
  );
}
