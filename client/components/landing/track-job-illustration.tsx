"use client";

import { Circle, CircleCheckBig, Loader } from "lucide-react";
import { AnimationPauseRoot } from "@/components/landing/animation-pause-root";
import { STEP_LABELS } from "@/lib/print-job-status";
import { getPrintJobStatusChipClassName } from "@/lib/print-job-status-config";
import type { DisplayStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type TrackJobIllustrationProps = {
  className?: string;
};

const STEPS = [
  { key: "queued" as const, status: "QUEUED" as DisplayStatus },
  { key: "received" as const, status: "RECEIVED" as DisplayStatus },
  { key: "preparing" as const, status: "READY" as DisplayStatus },
  { key: "printing" as const, status: "PRINTING" as DisplayStatus },
  { key: "printed" as const, status: "COMPLETED" as DisplayStatus },
] as const;

function stepActiveKeyframes(index: number) {
  const start = index * 16;
  const end = start + 15;
  if (index === 0) {
    return `
      0%, ${end}% { opacity: 1; }
      ${start + 16}%, 87% { opacity: 0; }
      88%, 100% { opacity: 1; }
    `;
  }
  return `
    0%, ${start - 1}% { opacity: 0; }
    ${start}%, ${end}% { opacity: 1; }
    ${start + 16}%, 100% { opacity: 0; }
  `;
}

function stepDoneKeyframes(index: number) {
  const start = (index + 1) * 16;
  const end = start + 15;
  if (index === 4) {
    return `
      0%, 79% { opacity: 0; }
      80%, 87% { opacity: 1; }
      88%, 100% { opacity: 0; }
    `;
  }
  return `
    0%, ${start - 1}% { opacity: 0; }
    ${start}%, 87% { opacity: 1; }
    88%, 100% { opacity: 0; }
  `;
}

function stepPendingKeyframes(index: number) {
  const activeStart = index * 16;
  const doneStart = (index + 1) * 16;
  if (index === 0) {
    return `
      0%, 15% { opacity: 0; }
      16%, 87% { opacity: 0; }
      88%, 100% { opacity: 0; }
    `;
  }
  if (index === 4) {
    return `
      0%, 63% { opacity: 1; }
      64%, 87% { opacity: 0; }
      88%, 100% { opacity: 1; }
    `;
  }
  return `
    0%, ${activeStart - 1}% { opacity: 1; }
    ${activeStart}%, ${doneStart - 1}% { opacity: 0; }
    ${doneStart}%, 87% { opacity: 0; }
    88%, 100% { opacity: 1; }
  `;
}

function stepHighlightKeyframes(index: number) {
  return stepActiveKeyframes(index);
}

function labelKeyframes(index: number) {
  const start = index * 16;
  const end = start + 15;
  if (index === 0) {
    return `
      0%, ${end}% { opacity: 1; }
      ${end + 1}%, 100% { opacity: 0; }
    `;
  }
  return `
    0%, ${start - 1}% { opacity: 0; }
    ${start}%, ${end}% { opacity: 1; }
    ${end + 1}%, 100% { opacity: 0; }
  `;
}

function chipKeyframes(index: number) {
  return labelKeyframes(index);
}

function buildKeyframes() {
  const lines: string[] = [];

  STEPS.forEach((_, index) => {
    lines.push(`
      @keyframes track-job-step-${index}-active {
        ${stepActiveKeyframes(index)}
      }
      @keyframes track-job-step-${index}-done {
        ${stepDoneKeyframes(index)}
      }
      @keyframes track-job-step-${index}-pending {
        ${stepPendingKeyframes(index)}
      }
      @keyframes track-job-row-${index}-highlight {
        ${stepHighlightKeyframes(index)}
      }
      @keyframes track-job-label-${index} {
        ${labelKeyframes(index)}
      }
      @keyframes track-job-chip-${index} {
        ${chipKeyframes(index)}
      }
    `);
  });

  lines.push(`
    .track-job-step-active,
    .track-job-step-done,
    .track-job-step-pending,
    .track-job-row-highlight,
    .track-job-label,
    .track-job-chip {
      animation-duration: 12s;
      animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      animation-iteration-count: infinite;
    }
  `);

  STEPS.forEach((_, index) => {
    lines.push(`
      .track-job-step-${index}-active {
        animation-name: track-job-step-${index}-active;
      }
      .track-job-step-${index}-done {
        animation-name: track-job-step-${index}-done;
      }
      .track-job-step-${index}-pending {
        animation-name: track-job-step-${index}-pending;
      }
      .track-job-row-${index}-highlight {
        animation-name: track-job-row-${index}-highlight;
      }
      .track-job-label-${index} {
        animation-name: track-job-label-${index};
      }
      .track-job-chip-${index} {
        animation-name: track-job-chip-${index};
      }
    `);
  });

  return lines.join("\n");
}

function StepRow({ index, label }: { index: number; label: string }) {
  return (
    <li className="relative flex items-center gap-2 rounded px-1 py-0.5">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded border border-primary/30 bg-primary/5 opacity-0",
          `track-job-row-${index}-highlight track-job-row-highlight`
        )}
        aria-hidden="true"
      />
      <div className="relative size-4 shrink-0">
        <CircleCheckBig
          className={cn(
            "absolute inset-0 size-4 text-green-500 opacity-0",
            `track-job-step-${index}-done track-job-step-done`
          )}
          aria-hidden="true"
        />
        <Loader
          className={cn(
            "absolute inset-0 size-4 animate-spin text-foreground opacity-0",
            `track-job-step-${index}-active track-job-step-active`
          )}
          aria-hidden="true"
        />
        <Circle
          className={cn(
            "absolute inset-0 size-4 text-muted-foreground/35 opacity-0",
            `track-job-step-${index}-pending track-job-step-pending`
          )}
          aria-hidden="true"
        />
      </div>
      <span className="relative truncate text-[0.58rem] leading-none text-muted-foreground">{label}</span>
    </li>
  );
}

export function TrackJobIllustration({ className }: TrackJobIllustrationProps) {
  return (
    <AnimationPauseRoot
      className={cn(
        "relative mt-6 flex h-44 w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-card px-3 mask-x-from-98% mask-x-to-100% mask-y-from-85% mask-y-to-100%",
        className
      )}
      aria-hidden="true"
    >
      <style>{buildKeyframes()}</style>

      <div className="relative mb-2 h-[0.8rem] w-full">
        {STEPS.map((step, index) => (
          <p
            key={step.key}
            className={cn(
              "track-job-label absolute inset-x-0 text-center font-heading text-[0.65rem] font-medium leading-none text-muted-foreground opacity-0",
              `track-job-label-${index}`
            )}
          >
            {STEP_LABELS[step.key]}
          </p>
        ))}
      </div>

      <div className="w-full max-w-[15.5rem] rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1 shadow-sm">
        <div className="mb-1 flex items-center justify-between gap-2 border-b border-border/50 pb-1">
          <p className="truncate font-medium text-[0.6rem] leading-none">assignment.pdf</p>
          <div className="relative h-[1rem] min-w-[4rem] shrink-0">
            {STEPS.map((step, index) => (
              <span
                key={step.key}
                className={cn(
                  "track-job-chip absolute right-0 top-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[0.42rem] font-medium leading-none opacity-0",
                  getPrintJobStatusChipClassName(step.status),
                  `track-job-chip-${index}`
                )}
              >
                {STEP_LABELS[step.key]}
              </span>
            ))}
          </div>
        </div>

        <ol className="flex flex-col gap-1">
          {STEPS.map((step, index) => (
            <StepRow key={step.key} index={index} label={STEP_LABELS[step.key]} />
          ))}
        </ol>
      </div>
    </AnimationPauseRoot>
  );
}
