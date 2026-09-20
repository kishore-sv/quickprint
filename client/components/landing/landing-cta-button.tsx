"use client";

import { useRouter } from "next/navigation";
import type { VariantProps } from "class-variance-authority";
import { ShinyButton } from "@/components/ui/shiny-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LandingCtaButtonProps = VariantProps<typeof buttonVariants> & {
  children?: React.ReactNode;
  className?: string;
};

/** Matches `buttonVariants` height/padding so CTAs align with adjacent landing buttons. */
const landingCtaSizeClass: Record<NonNullable<VariantProps<typeof buttonVariants>["size"]>, string> = {
  default: "h-8 min-h-8 px-2.5 py-0 text-sm",
  xs: "h-6 min-h-6 px-2 py-0 text-xs",
  sm: "h-7 min-h-7 px-2.5 py-0 text-[0.8rem]",
  lg: "h-9 min-h-9 px-2.5 py-0 text-sm",
  icon: "size-8 p-0",
  "icon-xs": "size-6 p-0",
  "icon-sm": "size-7 p-0",
  "icon-lg": "size-9 p-0",
};

export function LandingCtaButton({
  children = "Start Printing",
  size = "default",
  className,
}: LandingCtaButtonProps) {
  const router = useRouter();
  const resolvedSize = size ?? "default";

  return (
    <ShinyButton
      onClick={() => router.push("/sign-in")}
      className={cn(
        "w-auto border-transparent bg-primary px-2.5 shadow-inner shadow-blue-300/45 hover:bg-primary/94 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_3px_12px_-3px_color-mix(in_oklch,var(--primary),transparent_78%)] dark:border-primary/15 dark:bg-primary dark:shadow-blue-950/30 dark:hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_4px_14px_-4px_color-mix(in_oklch,var(--primary),transparent_82%)]",
        landingCtaSizeClass[resolvedSize],
        className
      )}
      labelClassName="normal-case tracking-normal text-primary-foreground dark:font-medium dark:text-primary-foreground"
    >
      {children}
    </ShinyButton>
  );
}
