"use client";

import {
  ShieldCheckIcon,
  SparklesIcon,
  TimerIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { LandingSection } from "@/components/landing/landing-section";
import { cn } from "@/lib/utils";

const linesBackground = [
  "repeating-linear-gradient(45deg, color-mix(in oklch, var(--border) 55%, transparent) 0, color-mix(in oklch, var(--border) 55%, transparent) 1px, transparent 1px, transparent 6px)",
  "repeating-linear-gradient(-45deg, color-mix(in oklch, var(--border) 55%, transparent) 0, color-mix(in oklch, var(--border) 55%, transparent) 1px, transparent 1px, transparent 6px)",
].join(", ");

const hoverMotion = {
  x: 8,
  y: 14,
  rotate: 6,
  zIndex: 10,
};

const hoverShadow = "0 20px 40px -12px color-mix(in oklch, var(--foreground) 18%, transparent)";

const pillars = [
  {
    title: "Simple",
    description: "A guided flow on your phone - scan, upload, configure, pay, and collect.",
    icon: SparklesIcon,
  },
  {
    title: "Fast",
    description: "Skip the queue. Submit your job from your phone while you are on the move.",
    icon: ZapIcon,
  },
  {
    title: "Convenient",
    description: "Print at kiosks where you already are, with status updates until pickup.",
    icon: TimerIcon,
  },
  {
    title: "Secure",
    description: "Pay online securely with Razorpay. Your job is sent to the kiosk only after payment is complete.",
    icon: ShieldCheckIcon,
  },
] as const;

const springTransition = {
  type: "spring" as const,
  stiffness: 260,
  damping: 18,
  mass: 0.8,
};

function PillarCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative isolate h-full overflow-visible">
      <div
        className="pointer-events-none absolute inset-0 z-0 min-h-40 rounded-2xl border border-border"
        aria-hidden="true"
        style={{ backgroundImage: linesBackground }}
      />
      <motion.div
        initial={false}
        style={{ transformOrigin: "top left" }}
        whileHover={
          prefersReducedMotion
            ? { boxShadow: "0 10px 30px -10px color-mix(in oklch, var(--primary) 25%, transparent)" }
            : { ...hoverMotion, boxShadow: hoverShadow }
        }
        transition={springTransition}
        className={cn(
          "relative z-10 h-full min-h-40 rounded-2xl border border-border bg-card p-6",
          prefersReducedMotion && "transition-shadow duration-300"
        )}
      >
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-6" />
        </div>
        <h3 className="font-heading text-xl font-medium">{title}</h3>
        <p className="mt-2 text-muted-foreground leading-relaxed">{description}</p>
      </motion.div>
    </div>
  );
}

export function ThreeColumnFeatures() {
  return (
    <LandingSection className="bg-muted/50">
      <div className="rounded-3xl border border-border bg-card p-1 md:p-1.5">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-4">
          {pillars.map((pillar) => (
            <PillarCard key={pillar.title} {...pillar} />
          ))}
        </div>
      </div>
    </LandingSection>
  );
}
