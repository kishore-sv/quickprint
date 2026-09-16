"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { fetchKioskDisplayState } from "@/lib/kiosk-display/api";
import { useKioskDisplay } from "@/lib/kiosk-display/use-kiosk-display";
import { KioskIdle } from "./kiosk-idle";
import { KioskJobProgress } from "./kiosk-job-progress";
import { KioskCompleted } from "./kiosk-completed";
import { KioskError } from "./kiosk-error";

type KioskDisplayProps = {
  kioskCode: string;
};

type PairingState = "checking" | "paired" | "unpaired";

export function KioskDisplay({ kioskCode }: KioskDisplayProps) {
  const [pairing, setPairing] = useState<PairingState>("checking");

  useEffect(() => {
    let cancelled = false;
    void fetchKioskDisplayState(kioskCode)
      .then(() => {
        if (!cancelled) setPairing("paired");
      })
      .catch(() => {
        if (!cancelled) setPairing("unpaired");
      });
    return () => {
      cancelled = true;
    };
  }, [kioskCode]);

  const view = useKioskDisplay(kioskCode, pairing === "paired");

  const content = useMemo(() => {
    switch (view.state) {
      case "IDLE":
        return (
          <KioskIdle
            kioskCode={view.kioskCode}
            kioskName={view.kioskName}
            scanUrl={view.scanUrl}
          />
        );
      case "RECEIVED":
      case "PREPARED":
      case "PRINTING":
        return <KioskJobProgress state={view.state} />;
      case "COMPLETED":
        return <KioskCompleted />;
      case "FAILED":
        return <KioskError />;
    }
  }, [view]);

  if (pairing === "checking") {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center">
        <p className="font-heading text-2xl text-muted-foreground">Starting display…</p>
      </div>
    );
  }

  if (pairing === "unpaired") {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center">
        <p className="font-heading text-2xl text-muted-foreground">
          Display not paired. Run the kiosk bootstrap on this device.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-background text-foreground">
      <AnimatePresence mode="wait">
        <motion.div
          key={view.state}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full w-full"
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
