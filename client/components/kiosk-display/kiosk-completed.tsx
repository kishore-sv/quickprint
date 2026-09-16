"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { KioskProgress } from "./kiosk-progress";
import { buildProgressSteps } from "@/lib/kiosk-display/map-kiosk-display-state";

const STAGGER = 0.25;

export function KioskCompleted() {
  const steps = buildProgressSteps("COMPLETED");

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-10 px-8 text-center">
      <motion.div
        initial={{ scale: 0, opacity: 0, rotate: -12 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0 }}
        className="flex size-36 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl"
      >
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.15 }}
        >
          <Check className="size-20" strokeWidth={2.5} />
        </motion.div>
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: STAGGER }}
        className="font-heading text-5xl font-semibold text-foreground md:text-6xl"
      >
        Printed!
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: STAGGER * 2 }}
        className="max-w-2xl font-heading text-2xl text-muted-foreground md:text-3xl"
      >
        Your document is ready.
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: STAGGER * 3 }}
        className="max-w-2xl text-xl text-muted-foreground md:text-2xl"
      >
        Please collect it from the tray.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: STAGGER * 4 }}
        className="flex w-full justify-center"
      >
        <KioskProgress steps={steps} animateCompletedChecks />
      </motion.div>
    </div>
  );
}
