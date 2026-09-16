"use client";

import { motion } from "motion/react";
import { QuickPrintLogo } from "@/components/quickprint-logo";
import { KioskQr } from "./kiosk-qr";

type KioskIdleProps = {
  kioskCode: string;
  kioskName: string;
  scanUrl: string;
};

export function KioskIdle({ kioskCode, kioskName, scanUrl }: KioskIdleProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8 px-8 text-center">
      <QuickPrintLogo className="text-5xl md:text-6xl" />
      <p className="font-heading text-2xl text-muted-foreground md:text-3xl">
        Scan. Pay. Print.
      </p>
      {scanUrl ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          <KioskQr scanUrl={scanUrl} size={340} />
        </motion.div>
      ) : null}
      <p className="font-heading text-3xl font-semibold text-foreground md:text-4xl">
        Scan to print
      </p>
      <p className="font-heading text-xl text-muted-foreground md:text-2xl">
        {kioskName || kioskCode}
      </p>
      <p className="max-w-xl text-lg text-muted-foreground">
        Scan the QR code with your phone to upload and pay for your print job.
      </p>
    </div>
  );
}
