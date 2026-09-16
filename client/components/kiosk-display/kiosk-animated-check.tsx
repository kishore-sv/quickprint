"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type KioskAnimatedCheckProps = {
  className?: string;
  iconClassName?: string;
  delay?: number;
};

/** Kiosk TV: always animate (ignore reduced-motion — signage should feel responsive). */
export function KioskAnimatedCheck({
  className,
  iconClassName,
  delay = 0,
}: KioskAnimatedCheckProps) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, rotate: -20 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 16,
        delay,
      }}
      className={cn("flex size-full items-center justify-center", className)}
    >
      <Check className={cn("size-7 shrink-0", iconClassName)} strokeWidth={2.5} />
    </motion.div>
  );
}
